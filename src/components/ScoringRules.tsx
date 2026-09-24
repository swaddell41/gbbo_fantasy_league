import { SCORING_RULES_TEXT } from '@/lib/scoring'

export default function ScoringRules({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className={embedded ? 'mt-6 p-4 bg-gray-50 rounded-lg' : 'bg-white rounded-lg shadow p-6'}>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Scoring Rules</h3>
      <ul className="space-y-1 text-sm text-gray-700">
        {SCORING_RULES_TEXT.map(rule => (
          <li key={rule.label} className="flex justify-between gap-4">
            <span>{rule.label}</span>
            <span className={`font-semibold ${rule.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {rule.points > 0 ? '+' : ''}
              {rule.points}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
