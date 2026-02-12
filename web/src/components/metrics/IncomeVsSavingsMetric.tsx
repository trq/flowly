import type { ComponentRenderProps } from "@json-render/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type IncomeVsSavingsMetricProps = {
  income: number
  savings: number
  title: string
}

export function IncomeVsSavingsMetric({
  element,
}: ComponentRenderProps<IncomeVsSavingsMetricProps>) {
  const { income, savings, title } = element.props
  const total = income + savings
  const incomeWidth = total > 0 ? (income / total) * 100 : 0
  const savingsWidth = total > 0 ? (savings / total) * 100 : 0

  return (
    <Card className="bg-zinc-900/35">
      <CardHeader className="pb-0">
        <CardTitle>{title}</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-zinc-300">Total</span>
          <span className="text-zinc-400">${total.toLocaleString()}</span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className="flex h-full w-full">
            <div className="bg-zinc-500" style={{ width: `${incomeWidth}%` }} />
            <div className="bg-sky-600" style={{ width: `${savingsWidth}%` }} />
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-zinc-500" />
              <span className="text-zinc-300">Income</span>
            </div>
            <span className="text-zinc-300">${income.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-sky-600" />
              <span className="text-zinc-300">Savings</span>
            </div>
            <span className="text-zinc-300">${savings.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
