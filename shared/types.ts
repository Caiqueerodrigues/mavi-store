export type Material = {
  id: number
  name: string
  supplier: string | null
  costType: 'material' | 'labor' | 'service' | 'packaging'
  unit: string
  purchasePrice: number
  yieldQuantity: number
  unitCost: number
  active: boolean
}

export type Component = {
  id?: number
  materialId: number
  materialName?: string
  unit?: string
  quantity: number
  wastePercent: number
  unitCost?: number
  totalCost?: number
}

export type Product = {
  id: number
  name: string
  sku: string
  category: string
  color: string | null
  currentPrice: number
  active: boolean
  components: Component[]
  productionCost: number
  minimumPrice: number
  expectedProfit: number
  currentProfit: number
}

export type Channel = {
  id: number
  name: string
  fixedFee: number
  percentageFee: number
  active: boolean
}
