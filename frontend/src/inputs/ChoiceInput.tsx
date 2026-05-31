import { useState } from 'react'
import type { Prompt } from '../types'
import styles from './ChoiceInput.module.css'

const PAGE_SIZE = 6

interface Props {
  prompt: Prompt
  onSubmit: (value: string) => void
}

export default function ChoiceInput({ prompt, onSubmit }: Props) {
  const choices = prompt.choices ?? []
  const [selected, setSelected] = useState<number | null>(null)
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(choices.length / PAGE_SIZE)
  const pageChoices = choices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleTap = (globalIndex: number) => {
    if (selected !== null) return
    setSelected(globalIndex)
    setTimeout(() => onSubmit(String(globalIndex + 1)), 300)
  }

  return (
    <div className={styles.root}>
      {prompt.headline && <span className={styles.headline}>{prompt.headline}</span>}
      <p className={styles.promptText}>{prompt.text}</p>

      <div className={styles.choices}>
        {pageChoices.map((text, i) => {
          const globalIndex = page * PAGE_SIZE + i
          const isSelected = selected === globalIndex
          return (
            <div
              key={globalIndex}
              className={`${styles.choice} ${isSelected ? styles.selected : ''}`}
              role="button"
              onClick={() => handleTap(globalIndex)}
            >
              <span className={styles.choiceText}>{text}</span>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            ← prev
          </button>
          <span className={styles.pageInfo}>{page + 1} / {totalPages}</span>
          <button
            className={styles.pageBtn}
            disabled={page === totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            next →
          </button>
        </div>
      )}
    </div>
  )
}
