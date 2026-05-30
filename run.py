import sys
import runpy
from pathlib import Path

root = Path(__file__).parent
sys.path.insert(0, str(root))

script = root / "scripts" / sys.argv[1]
runpy.run_path(str(script), run_name="__main__")
