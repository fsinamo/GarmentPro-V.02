import { Product, Accessory, RawMaterial, ConsumptionDetail, RawMaterialSummary, CalculationProductItem } from '../types';

export interface CalculationInputRow {
  accessoryId: string;
  qtyPerProduct: number;
  rawMaterialId: string;
  consumptionPerUnit: number; // Pemakaian dalam 6 desimal (contoh: 0.002151)
  yieldPerUnit?: number; // Ekuivalen hasil (1 / pemakaian)
  allowancePercent: number; // susut / waste %
}

/**
 * Calculates raw material consumption for one or multiple finished goods (Barang Jadi).
 * Formula:
 * - Pemakaian (dalam 6 desimal) per pcs accessory
 * - Total Kebutuhan Aksesoris = Qty Order * Qty Aksesoris per Produk
 * - Kebutuhan Bahan Baku = Total Aksesoris * Pemakaian (Ketepatan 6 Desimal)
 * - Berapapun ukuran bahan baku (Panjang x Lebar = Total Penampang), pemakaian dihitung akurat.
 */
export function calculateConsumption(
  productOrProducts: Product | Product[],
  orderQuantityOrQuantities: number | number[],
  allAccessories: Accessory[],
  allRawMaterials: RawMaterial[],
  customOverrides?: Record<string, Partial<CalculationInputRow>>,
  efficiencyFactorPercent: number = 0, // e.g. nesting saving or safety allowance
  productItemsList?: CalculationProductItem[]
): { details: ConsumptionDetail[]; summary: RawMaterialSummary[] } {
  const details: ConsumptionDetail[] = [];
  const rawMaterialGroups: Record<
    string,
    {
      material: RawMaterial;
      totalCalculated: number;
      breakdown: Array<{
        productName?: string;
        accessoryName: string;
        accessoryQty: number;
        consumptionPerUnit: number;
        yieldPerUnit?: number;
        rawMaterialPortion: number;
      }>;
    }
  > = {};

  // Normalize products and quantities into an array of items
  const productEntries: Array<{ product: Product; orderQuantity: number; overrides?: Record<string, Partial<CalculationInputRow>> }> = [];

  if (productItemsList && productItemsList.length > 0) {
    for (const item of productItemsList) {
      const p = (Array.isArray(productOrProducts) ? productOrProducts : [productOrProducts]).find((prod) => prod.id === item.productId)
        || {
          id: item.productId,
          code: item.productCode || 'PRD',
          name: item.productName,
          category: item.productCategory || 'Umum',
          unit: 'Pcs',
          description: item.description,
          accessories: [],
          createdAt: '',
          updatedAt: '',
        };
      productEntries.push({
        product: p,
        orderQuantity: item.orderQuantity,
        overrides: item.customOverrides,
      });
    }
  } else if (Array.isArray(productOrProducts)) {
    const qtys = Array.isArray(orderQuantityOrQuantities) ? orderQuantityOrQuantities : [orderQuantityOrQuantities];
    productOrProducts.forEach((p, idx) => {
      productEntries.push({
        product: p,
        orderQuantity: qtys[idx] ?? qtys[0] ?? 1000,
        overrides: customOverrides,
      });
    });
  } else {
    productEntries.push({
      product: productOrProducts,
      orderQuantity: typeof orderQuantityOrQuantities === 'number' ? orderQuantityOrQuantities : (orderQuantityOrQuantities[0] || 1000),
      overrides: customOverrides,
    });
  }

  // Iterate over each product
  for (const { product, orderQuantity, overrides } of productEntries) {
    for (const rel of product.accessories) {
      const accessory = allAccessories.find((a) => a.id === rel.accessoryId);
      if (!accessory) continue;

      const isDirect = accessory.category === 'ready_made' || accessory.category === 'service';
      const isService = accessory.category === 'service';
      const rowOverride = (overrides && overrides[accessory.id]) || (customOverrides && customOverrides[accessory.id]);

      const qtyPerProduct = rowOverride?.qtyPerProduct !== undefined ? rowOverride.qtyPerProduct : rel.qtyPerProduct;
      const rawMaterialId = isDirect
        ? `direct-${accessory.id}`
        : (rowOverride?.rawMaterialId || accessory.defaultRawMaterialId || '');

      // Resolve consumption per unit (in 6 decimal precision)
      let consumptionPerUnit = 1;
      if (isDirect) {
        consumptionPerUnit = 1;
      } else if (rowOverride?.consumptionPerUnit !== undefined && rowOverride.consumptionPerUnit > 0) {
        consumptionPerUnit = rowOverride.consumptionPerUnit;
      } else if (accessory.defaultConsumptionPerUnit !== undefined && accessory.defaultConsumptionPerUnit > 0) {
        consumptionPerUnit = accessory.defaultConsumptionPerUnit;
      } else if (accessory.defaultYieldPerUnit && accessory.defaultYieldPerUnit > 0) {
        // Fallback / conversion: Pemakaian = 1 / yield
        consumptionPerUnit = Number((1 / accessory.defaultYieldPerUnit).toFixed(6));
      } else {
        consumptionPerUnit = 0.0025; // default reasonable fallback
      }

      const yieldEquivalent = consumptionPerUnit > 0 ? Number((1 / consumptionPerUnit).toFixed(2)) : 0;
      const allowancePercent = isDirect
        ? 0
        : (rowOverride?.allowancePercent !== undefined ? rowOverride.allowancePercent : 0);

      // Raw Material details
      const rawMaterial: RawMaterial = isDirect
        ? {
            id: `direct-${accessory.id}`,
            code: accessory.code,
            name: isService ? `${accessory.name} (Jasa Pengerjaan)` : `${accessory.name} (Beli Jadi)`,
            thickness: '-',
            length: 0,
            width: 0,
            totalArea: 0,
            specification: isService ? 'Jasa & Ongkos Pengerjaan (Non-Bahan Baku)' : 'Accessories Jadi (Komponen Siap Pakai)',
            unit: accessory.unit,
            currentStock: 0,
            createdAt: '',
            updatedAt: '',
          }
        : (allRawMaterials.find((m) => m.id === rawMaterialId) || {
            id: rawMaterialId,
            code: 'UNKNOWN',
            name: 'Bahan Baku Tidak Diketahui',
            thickness: '-',
            specification: '-',
            unit: 'Unit',
            currentStock: 0,
            createdAt: '',
            updatedAt: '',
          });

      const totalAccessoryNeeded = Math.round(orderQuantity * qtyPerProduct);
      
      // Kebalikan dari yield: Bahan Baku = Total Aksesoris * Pemakaian (6 desimal)
      const baseRawMaterialNeeded = totalAccessoryNeeded * consumptionPerUnit;
      const rawMaterialWithAllowance = baseRawMaterialNeeded * (1 + allowancePercent / 100);

      const formattedDimensions = rawMaterial.length && rawMaterial.width
        ? `${rawMaterial.length} × ${rawMaterial.width} ${rawMaterial.dimensionUnit || 'cm'}`
        : undefined;

      const detailItem: ConsumptionDetail = {
        productId: product.id,
        productName: product.name,
        accessoryId: accessory.id,
        accessoryName: accessory.name,
        qtyPerProduct,
        totalAccessoryNeeded,
        rawMaterialId: rawMaterial.id,
        rawMaterialName: rawMaterial.name,
        rawMaterialThickness: rawMaterial.thickness || '-',
        rawMaterialDimensions: formattedDimensions,
        rawMaterialTotalArea: rawMaterial.totalArea || (rawMaterial.length && rawMaterial.width ? rawMaterial.length * rawMaterial.width : undefined),
        rawMaterialSpec: rawMaterial.specification,
        rawMaterialUnit: rawMaterial.unit,
        consumptionPerUnit: Number(consumptionPerUnit.toFixed(6)),
        yieldPerUnit: yieldEquivalent,
        rawMaterialCalculated: Number(baseRawMaterialNeeded.toFixed(6)),
        allowancePercent,
        rawMaterialWithAllowance: Number(rawMaterialWithAllowance.toFixed(6)),
      };

      details.push(detailItem);

      if (!rawMaterialGroups[rawMaterial.id]) {
        rawMaterialGroups[rawMaterial.id] = {
          material: rawMaterial,
          totalCalculated: 0,
          breakdown: [],
        };
      }

      rawMaterialGroups[rawMaterial.id].totalCalculated += rawMaterialWithAllowance;
      rawMaterialGroups[rawMaterial.id].breakdown.push({
        productName: product.name,
        accessoryName: accessory.name,
        accessoryQty: totalAccessoryNeeded,
        consumptionPerUnit: Number(consumptionPerUnit.toFixed(6)),
        yieldPerUnit: yieldEquivalent,
        rawMaterialPortion: Number(rawMaterialWithAllowance.toFixed(6)),
      });
    }
  }

  // Generate summaries with exact 6-decimal precision
  const summary: RawMaterialSummary[] = Object.values(rawMaterialGroups).map((group) => {
    let finalTotal = group.totalCalculated;
    if (efficiencyFactorPercent !== 0) {
      finalTotal = finalTotal * (1 + efficiencyFactorPercent / 100);
    }

    const rounded6Decimals = Number(finalTotal.toFixed(6));
    const roundedCeil = Math.ceil(finalTotal);

    const formattedDimensions = group.material.length && group.material.width
      ? `${group.material.length} × ${group.material.width} ${group.material.dimensionUnit || 'cm'}`
      : undefined;

    const unitPrice = group.material.unitPrice || 0;
    const totalEstimatedCost = unitPrice > 0 ? Math.round(rounded6Decimals * unitPrice) : undefined;

    return {
      rawMaterialId: group.material.id,
      rawMaterialName: group.material.name,
      thickness: group.material.thickness || '-',
      length: group.material.length,
      width: group.material.width,
      dimensionUnit: group.material.dimensionUnit || 'cm',
      totalArea: group.material.totalArea || (group.material.length && group.material.width ? group.material.length * group.material.width : undefined),
      dimensions: formattedDimensions,
      specification: group.material.specification,
      unit: group.material.unit,
      totalRequired: rounded6Decimals,
      roundedRequired: roundedCeil,
      unitPrice,
      totalEstimatedCost,
      breakdown: group.breakdown,
    };
  });

  return { details, summary };
}
