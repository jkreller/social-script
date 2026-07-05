#!/usr/bin/env python3
"""Dev tool: wrap framework-fixed string literals in social_script/*.py with the
translation lookup function `_()`, and register them in the German catalog
(social_script/_internal/i18n.py) with a "TODO" placeholder.

Scans calls to a known set of display functions (io_read and the thin wrappers
around it: sense, choose, decide, count_people, poll) and wraps their primary
text/question/prompt argument and their `headline` keyword:

- A plain string literal becomes `_("...")`.
- An f-string is split into a `{name}`-templated form with the dynamic parts passed
  as keyword arguments, using each expression's own simple name where possible.
- A bare variable reference that was assigned, earlier in the same function, from a
  literal / f-string / a two-branch ternary of literals is resolved back to that
  assignment and wrapped there instead (so the call site itself is untouched).
- Anything else at one of these argument slots (a bare variable this tool can't
  trace, a more complex expression) is left alone and printed as a manual-review
  note — it is not silently guessed at.

Already-wrapped calls (`_(...)`) are left alone, so this is safe to re-run against
changed files to catch newly-added, still-unwrapped strings.

Usage: python3 tools/i18n_wrap.py <file.py> [<file.py> ...]
"""
import ast
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
I18N_PATH = REPO_ROOT / "social_script" / "_internal" / "i18n.py"

# function name -> (index of primary positional argument, or None; set of keyword
# argument names to also wrap). Only true leaf calls belong here — `sense`,
# `choose`, `decide`, `count_people`, `poll` all wrap their own `prompt`/`headline`
# argument internally before calling `io_read`, so every call to them found by this
# tool (which only ever scans social_script's own framework files) is an
# internal-to-internal call where the callee already handles translation — wrapping
# the argument again at the call site would just double-wrap it.
DISPLAY_CALLS = {
    "io_read": (0, {"headline"}),
    "io_write": (None, set()),
}

# function name -> parameter names whose string *default value* should be
# registered in the catalog even though it's never rewritten in code — the
# function's own body already wraps whatever value the parameter holds at runtime
# (e.g. `sense(prompt, *, headline="sense")` calls `io_read(_(prompt), headline=_(headline), ...)`),
# so the default just needs a matching catalog entry, not a code change.
DEFAULT_VALUE_CATALOG_SOURCES = {
    ("sense", "headline"),
    ("choose", "prompt"),
    ("count_people", "prompt"),
}


def is_wrapped(node):
    return isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "_"


def is_static_leaf(node):
    return isinstance(node, ast.Constant) and isinstance(node.value, str) or isinstance(node, ast.JoinedStr)


def placeholder_name(expr, used, counter):
    if isinstance(expr, ast.Name):
        base = expr.id
    elif isinstance(expr, ast.Attribute):
        base = expr.attr
    else:
        counter[0] += 1
        base = f"v{counter[0]}"
    name, n = base, 1
    while name in used:
        n += 1
        name = f"{base}{n}"
    used.add(name)
    return name


def joinedstr_to_call(node: ast.JoinedStr, src: str):
    """Return (call_source, template_msgid) for an f-string, splitting it into a
    named-placeholder template plus keyword substitutions."""
    parts, kwargs, used, counter = [], [], set(), [0]
    for value in node.values:
        if isinstance(value, ast.Constant):
            parts.append(value.value.replace("{", "{{").replace("}", "}}"))
        elif isinstance(value, ast.FormattedValue):
            name = placeholder_name(value.value, used, counter)
            parts.append(f"{{{name}}}")
            expr_src = ast.get_source_segment(src, value.value)
            kwargs.append(f"{name}={expr_src}")
    template = "".join(parts)
    args = ", ".join([repr(template)] + kwargs)
    return f"_({args})", template


def leaf_to_call(node, src: str):
    """Return (call_source, msgid_for_catalog) for a Constant str or JoinedStr."""
    if isinstance(node, ast.Constant):
        return f"_({node.value!r})", node.value
    return joinedstr_to_call(node, src)


class FunctionAssigns(ast.NodeVisitor):
    """Collects, per enclosing function, simple `name = <literal-ish>` assignments,
    so a bare Name argument at a call site can be traced back to its literal."""

    def __init__(self):
        self.by_function = {}  # ast.FunctionDef -> {name: rhs_node}
        self._stack = []

    def visit_FunctionDef(self, node):
        self._stack.append(node)
        self.by_function.setdefault(node, {})
        self.generic_visit(node)
        self._stack.pop()

    visit_AsyncFunctionDef = visit_FunctionDef

    def visit_Assign(self, node):
        if self._stack and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            rhs = node.value
            resolvable = is_static_leaf(rhs) or (
                isinstance(rhs, ast.IfExp) and is_static_leaf(rhs.body) and is_static_leaf(rhs.orelse)
            )
            if resolvable:
                self.by_function[self._stack[-1]][node.targets[0].id] = node
        self.generic_visit(node)


def process(path: Path):
    src = path.read_text()
    tree = ast.parse(src)

    assigns = FunctionAssigns()
    assigns.visit(tree)
    # flatten to a lookup: for a given Name node, find the nearest enclosing
    # function's tracked assignment for that name (functions don't nest here)
    name_to_assign = {}
    for func, table in assigns.by_function.items():
        for name, assign_node in table.items():
            name_to_assign[(func, name)] = assign_node

    parents = {}
    for node in ast.walk(tree):
        for child in ast.iter_child_nodes(node):
            parents[child] = node

    def enclosing_function(node):
        while node in parents:
            node = parents[node]
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                return node
        return None

    def offsets_of(node):
        return (node.lineno, node.col_offset, node.end_lineno, node.end_col_offset)

    line_starts = [0]
    for line in src.splitlines(keepends=True):
        line_starts.append(line_starts[-1] + len(line))

    def abs_offset(lineno, col):
        return line_starts[lineno - 1] + col

    edits = []       # (start, end, replacement)
    new_entries = []
    review_notes = []

    def handle_target(target_node, call_node):
        if is_wrapped(target_node):
            return
        if isinstance(target_node, (ast.Constant, ast.JoinedStr)) and (
            not isinstance(target_node, ast.Constant) or isinstance(target_node.value, str)
        ):
            call_src, msgid = leaf_to_call(target_node, src)
            new_entries.append(msgid)
            lineno, col, end_lineno, end_col = offsets_of(target_node)
            edits.append((abs_offset(lineno, col), abs_offset(end_lineno, end_col), call_src))
            return
        if isinstance(target_node, ast.Name):
            func = enclosing_function(call_node)
            assign_node = name_to_assign.get((func, target_node.id)) if func else None
            if assign_node is not None:
                rhs = assign_node.value
                branches = [rhs.body, rhs.orelse] if isinstance(rhs, ast.IfExp) else [rhs]
                for branch in branches:
                    if is_wrapped(branch):
                        continue
                    call_src, msgid = leaf_to_call(branch, src)
                    new_entries.append(msgid)
                    lineno, col, end_lineno, end_col = offsets_of(branch)
                    edits.append((abs_offset(lineno, col), abs_offset(end_lineno, end_col), call_src))
                return
        review_notes.append(
            f"{path}:{target_node.lineno}: manual review needed — "
            f"{ast.dump(target_node, annotate_fields=False)[:80]}"
        )

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Name):
            continue
        if node.func.id not in DISPLAY_CALLS:
            continue
        pos_index, kw_names = DISPLAY_CALLS[node.func.id]
        if pos_index is not None and pos_index < len(node.args):
            handle_target(node.args[pos_index], node)
        for kw in node.keywords:
            if kw.arg in kw_names:
                handle_target(kw.value, node)

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        args = node.args
        defaults = list(zip(args.args[len(args.args) - len(args.defaults):], args.defaults)) if args.defaults else []
        defaults += list(zip(args.kwonlyargs, args.kw_defaults))
        for arg, default in defaults:
            if default is None or not isinstance(default, ast.Constant) or not isinstance(default.value, str):
                continue
            if (node.name, arg.arg) in DEFAULT_VALUE_CATALOG_SOURCES:
                new_entries.append(default.value)

    edits.sort(key=lambda e: e[0], reverse=True)
    for start, end, replacement in edits:
        src = src[:start] + replacement + src[end:]

    if edits and "from social_script._internal.i18n import _" not in src:
        m = list(re.finditer(r"^(?:import|from) .+$", src, re.MULTILINE))
        insert_at = m[-1].end() if m else 0
        src = src[:insert_at] + "\nfrom social_script._internal.i18n import _" + src[insert_at:]

    if edits:
        path.write_text(src)

    return new_entries, review_notes


def update_catalog(all_entries):
    i18n_src = I18N_PATH.read_text()
    existing = set(re.findall(r'"((?:[^"\\]|\\.)*)":\s*"', i18n_src))
    new = sorted(set(e for e in all_entries if e) - existing)
    if not new:
        return 0
    insertion = "".join(f"        {msgid!r}: \"TODO\",\n" for msgid in new)
    i18n_src = i18n_src.replace('"de": {\n', '"de": {\n' + insertion, 1) if '"de": {\n' in i18n_src else i18n_src.replace('"de": {', '"de": {\n' + insertion, 1)
    I18N_PATH.write_text(i18n_src)
    return len(new)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    all_entries, all_notes = [], []
    for arg in sys.argv[1:]:
        path = Path(arg)
        entries, notes = process(path)
        print(f"{path}: wrapped {len(entries)} string(s), {len(notes)} flagged for review")
        all_entries.extend(entries)
        all_notes.extend(notes)

    added = update_catalog(all_entries)
    print(f"Catalog: added {added} new TODO entries to {I18N_PATH}")

    if all_notes:
        print("\nManual review needed:")
        for note in all_notes:
            print(f"  {note}")


if __name__ == "__main__":
    main()
