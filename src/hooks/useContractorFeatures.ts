import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface ProjectVariationItem {
  id: string;
  variation_id: string;
  material_master_id: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface ProjectVariation {
  id: string;
  project_id: string;
  number: number;
  title: string;
  description: string | null;
  extra_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  items?: ProjectVariationItem[];
}

export interface Supplier {
  id: string;
  company_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  gst_number: string | null;
  address: string | null;
  rating: number | null;
  lead_time_days: number | null;
  payment_terms: string | null;
  created_at: string;
}

export interface MaterialStock {
  id: string;
  project_id: string;
  material_id: string;
  current_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  minimum_stock: number;
  material_name?: string;
  material_unit?: string;
}

export interface InventoryLedgerEntry {
  id: string;
  project_id: string;
  material_master_id: string;
  material_name?: string;
  transaction_type: 'OPENING' | 'PURCHASE_RECEIVED' | 'SITE_ISSUE' | 'RETURN' | 'TRANSFER' | 'ADJUSTMENT' | 'WASTAGE' | 'SCRAP';
  quantity: number;
  reference_type: 'dpr' | 'delivery' | 'variation' | 'manual' | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  batch_number: string | null;
  supplier_id: string | null;
  supplier_name?: string;
}

export interface FacadeSection {
  id: string;
  project_id: string;
  label: string;
  status: 'not_started' | 'in_progress' | 'completed';
  polygon_pts: { x: number; y: number }[] | null;
  image_url: string | null;
  created_at: string;
}

export interface ProjectEvent {
  id: string;
  project_id: string;
  event_type:
    | 'BOQ_IMPORTED'
    | 'DPR_SUBMITTED'
    | 'DPR_APPROVED'
    | 'VARIATION_APPROVED'
    | 'QA_PASSED'
    | 'SNAG_CREATED'
    | 'MATERIAL_ISSUED'
    | 'STOCK_RECEIVED';
  description: string;
  created_by: string | null;
  created_name?: string;
  created_at: string;
  metadata: any | null;
}

/** Hook to fetch suppliers list */
export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async (): Promise<Supplier[]> => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Supplier[];
    },
  });
}

/** Hook to fetch material stock summary */
export function useMaterialStock(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['material_stock', projectId],
    queryFn: async (): Promise<MaterialStock[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('material_stock')
        .select(`
          *,
          material_master(name, unit)
        `)
        .eq('project_id', projectId);
      if (error) throw error;
      return data.map((d: any) => ({
        ...d,
        material_name: d.material_master?.name || 'Unknown',
        material_unit: d.material_master?.unit || 'm²',
      })) as MaterialStock[];
    },
    enabled: !!projectId,
  });
}

/** Hook to fetch immutable events feed for a project */
export function useProjectEvents(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['project_events', projectId],
    queryFn: async (): Promise<ProjectEvent[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_events')
        .select(`
          *,
          profiles(full_name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map((d: any) => ({
        ...d,
        created_name: d.profiles?.full_name || 'System',
      })) as ProjectEvent[];
    },
    enabled: !!projectId,
  });
}

/** Hook to fetch variations for a project */
export function useProjectVariations(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['project_variations', projectId],
    queryFn: async (): Promise<ProjectVariation[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_variations')
        .select('*, items:project_variation_items(*)')
        .eq('project_id', projectId)
        .order('number', { ascending: true });
      if (error) throw error;
      return data as ProjectVariation[];
    },
    enabled: !!projectId,
  });
}

/** Mutation to create a new Variation with items */
export function useCreateVariation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      title,
      description,
      items,
    }: {
      projectId: string;
      title: string;
      description: string;
      items: { material_master_id: string | null; item_name: string; quantity: number; unit: string; rate: number }[];
    }) => {
      const { data: currentVars, error: numError } = await supabase
        .from('project_variations')
        .select('number')
        .eq('project_id', projectId);
      if (numError) throw numError;
      const nextNum = (currentVars?.length || 0) + 1;

      const totalAmount = items.reduce((acc, it) => acc + it.quantity * it.rate, 0);

      const { data: variation, error: varError } = await supabase
        .from('project_variations')
        .insert({
          project_id: projectId,
          number: nextNum,
          title,
          description,
          extra_amount: totalAmount,
          status: 'pending',
        })
        .select()
        .single();
      if (varError) throw varError;

      const itemPayload = items.map((it) => ({
        variation_id: variation.id,
        material_master_id: it.material_master_id,
        item_name: it.item_name,
        quantity: it.quantity,
        unit: it.unit,
        rate: it.rate,
      }));

      const { error: itemsError } = await supabase
        .from('project_variation_items')
        .insert(itemPayload);
      if (itemsError) throw itemsError;

      return variation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project_variations', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
}

/** Mutation to approve/reject variation */
export function useApproveVariation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      variationId,
      status,
      approverId,
    }: {
      variationId: string;
      status: 'approved' | 'rejected';
      approverId: string;
    }) => {
      const { data: variation, error } = await supabase
        .from('project_variations')
        .update({
          status,
          approved_by: approverId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', variationId)
        .select()
        .single();
      if (error) throw error;

      if (status === 'approved') {
        const { data: items } = await supabase
          .from('project_variation_items')
          .select('*')
          .eq('variation_id', variationId);

        if (items && items.length > 0) {
          const ledgerPayload = items
            .filter((it) => it.material_master_id)
            .map((it) => ({
              project_id: variation.project_id,
              material_master_id: it.material_master_id,
              transaction_type: 'ADJUSTMENT',
              quantity: it.quantity,
              reference_type: 'variation',
              reference_id: variationId,
              notes: `Variation #${variation.number} approval: Added to project scope`,
              created_by: approverId,
              batch_number: `VAR-${variation.number}`,
            }));

          if (ledgerPayload.length > 0) {
            await supabase.from('inventory_ledger').insert(ledgerPayload);
          }
        }

        await supabase.rpc('log_project_event', {
          p_project_id: variation.project_id,
          p_event_type: 'VARIATION_APPROVED',
          p_description: `Variation #${variation.number} approved: Added ₹${variation.extra_amount.toLocaleString('en-IN')} to contract value`,
          p_created_by: approverId,
        });
      }

      return variation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project_variations', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['inventory_ledger', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['material_stock', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['project_events', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/** Hook to fetch inventory ledger entries for a project */
export function useInventoryLedger(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['inventory_ledger', projectId],
    queryFn: async (): Promise<InventoryLedgerEntry[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('inventory_ledger')
        .select(`
          *,
          material_master(name),
          suppliers(name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      return data.map((d: any) => ({
        ...d,
        material_name: d.material_master?.name || 'Unknown',
        supplier_name: d.suppliers?.name || 'Manual Log',
      })) as InventoryLedgerEntry[];
    },
    enabled: !!projectId,
  });
}

/** Mutation to add custom inventory ledger adjustment/received entry */
export function useCreateInventoryLedgerEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      materialMasterId: string;
      transactionType: 'OPENING' | 'PURCHASE_RECEIVED' | 'SITE_ISSUE' | 'RETURN' | 'TRANSFER' | 'ADJUSTMENT' | 'WASTAGE' | 'SCRAP';
      quantity: number;
      notes?: string;
      createdBy: string;
      batchNumber?: string;
      supplierId?: string;
    }) => {
      const { data, error } = await supabase
        .from('inventory_ledger')
        .insert({
          project_id: params.projectId,
          material_master_id: params.materialMasterId,
          transaction_type: params.transactionType,
          quantity: params.quantity,
          reference_type: 'manual',
          notes: params.notes || null,
          created_by: params.createdBy,
          batch_number: params.batchNumber || null,
          supplier_id: params.supplierId || null,
        })
        .select()
        .single();
      if (error) throw error;

      if (params.transactionType === 'PURCHASE_RECEIVED') {
        const { data: mat } = await supabase
          .from('material_master')
          .select('name')
          .eq('id', params.materialMasterId)
          .single();

        let supName = 'N/A';
        if (params.supplierId) {
          const { data: sup } = await supabase.from('suppliers').select('name').eq('id', params.supplierId).single();
          if (sup) supName = sup.name;
        }

        await supabase.rpc('log_project_event', {
          p_project_id: params.projectId,
          p_event_type: 'STOCK_RECEIVED',
          p_description: `Received ${params.quantity} units of ${mat?.name || 'materials'} (Batch: ${params.batchNumber || 'N/A'}, Supplier: ${supName})`,
          p_created_by: params.createdBy,
        });
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory_ledger', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['material_stock', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project_events', variables.projectId] });
    },
  });
}

/** Hook to fetch facade map sections */
export function useFacadeSections(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['facade_sections', projectId],
    queryFn: async (): Promise<FacadeSection[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('facade_sections')
        .select('*')
        .eq('project_id', projectId)
        .order('label', { ascending: true });
      if (error) throw error;
      return data as FacadeSection[];
    },
    enabled: !!projectId,
  });
}

/** Mutation to generate a standard 4x4 matrix of facade map panels */
export function useInitializeFacadeSections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const bays = ['BayA', 'BayB', 'BayC', 'BayD'];
      const floors = ['L1', 'L2', 'L3', 'L4'];
      const payload: any[] = [];

      floors.forEach((fl) => {
        bays.forEach((bay) => {
          payload.push({
            project_id: projectId,
            label: `${fl}-${bay}`,
            status: 'not_started',
          });
        });
      });

      const { error } = await supabase
        .from('facade_sections')
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['facade_sections', projectId] });
    },
  });
}

/** Mutation to update elevation panel progress status */
export function useUpdateFacadeSectionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sectionId,
      status,
      projectId,
    }: {
      sectionId: string;
      status: 'not_started' | 'in_progress' | 'completed';
      projectId: string;
    }) => {
      const { error } = await supabase
        .from('facade_sections')
        .update({ status })
        .eq('id', sectionId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['facade_sections', variables.projectId] });
    },
  });
}

/** Mutation to issue material requests with stock batch FIFO junction mapping */
export function useIssueMaterialRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      projectId,
      materialMasterId,
      materialName,
      qty,
      batchNumber,
      issuerId,
    }: {
      requestId: string;
      projectId: string;
      materialMasterId: string;
      materialName: string;
      qty: number;
      batchNumber: string;
      issuerId: string;
    }) => {
      // 1. Insert a used/issued ledger entry
      const { data: ledgerEntry, error: ledgerErr } = await supabase
        .from('inventory_ledger')
        .insert({
          project_id: projectId,
          material_master_id: materialMasterId,
          transaction_type: 'SITE_ISSUE',
          quantity: qty,
          reference_type: 'manual',
          notes: `Issued for Material Request: ${materialName}`,
          created_by: issuerId,
          batch_number: batchNumber,
        })
        .select()
        .single();
      if (ledgerErr) throw ledgerErr;

      // 2. Insert into material_request_batches mapping
      const { error: batchMappingErr } = await supabase
        .from('material_request_batches')
        .insert({
          material_request_id: requestId,
          inventory_ledger_id: ledgerEntry.id,
          batch_number: batchNumber,
          issued_quantity: qty,
        });
      if (batchMappingErr) throw batchMappingErr;

      // 3. Update Material Request status
      const { error: reqErr } = await supabase
        .from('material_requests')
        .update({
          status: 'ordered', // Fulfilled status
          approved_qty: qty,
          issued_qty: qty,
          issued_at: new Date().toISOString(),
          decided_by: issuerId,
          decided_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      if (reqErr) throw reqErr;

      // 4. Publish MATERIAL_ISSUED event with metadata
      await supabase.rpc('log_project_event', {
        p_project_id: projectId,
        p_event_type: 'MATERIAL_ISSUED',
        p_description: `Issued ${qty} units of ${materialName} from Batch: ${batchNumber}`,
        p_created_by: issuerId,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material_requests', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['inventory_ledger', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['material_stock', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project_events', variables.projectId] });
    },
  });
}

// Purchase Orders, GRNs and interactive Facade Maps Hooks

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  material_master_id: string;
  material_name?: string;
  qty_ordered: number;
  qty_received: number;
  rate: number;
  amount: number;
}

export interface PurchaseOrder {
  id: string;
  company_id: string;
  project_id: string;
  supplier_id: string;
  supplier_name?: string;
  po_number: string;
  status: 'draft' | 'submitted' | 'approved' | 'sent' | 'partially_received' | 'fully_received' | 'closed' | 'cancelled';
  total_amount: number;
  expected_delivery_date: string | null;
  delivery_address: string | null;
  currency: string;
  remarks: string | null;
  terms_conditions: string | null;
  revision_number: number;
  created_at: string;
  created_by: string | null;
  items?: PurchaseOrderItem[];
}

export interface GoodsReceivedItem {
  id: string;
  goods_received_note_id: string;
  purchase_order_item_id: string;
  qty_received: number;
  qty_accepted: number;
  qty_rejected: number;
  rejection_reason: string | null;
  batch_number: string;
}

export interface GoodsReceivedNote {
  id: string;
  company_id: string;
  purchase_order_id: string;
  grn_number: string;
  received_date: string;
  received_by: string | null;
  delivery_challan: string | null;
  invoice_number: string | null;
  vehicle_number: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  inspection_status: 'passed' | 'failed' | 'partial';
  created_at: string;
  items?: GoodsReceivedItem[];
}

export interface FacadeDrawing {
  id: string;
  project_id: string;
  title: string;
  image_path: string;
  created_at: string;
}

export interface FacadeMapZone {
  id: string;
  facade_drawing_id: string;
  label: string;
  polygon_points: { x: number; y: number }[];
  status: 'not_started' | 'in_progress' | 'completed';
  floor: string | null;
  elevation: string | null;
  created_at: string;
}

/** Hook to fetch purchase orders */
export function usePurchaseOrders(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['purchase_orders', projectId],
    queryFn: async (): Promise<PurchaseOrder[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name), items:purchase_order_items(*, material_master(name))')
        .eq('project_id', projectId)
        .order('po_number', { ascending: false });
      if (error) throw error;
      return data.map((d: any) => ({
        ...d,
        supplier_name: d.suppliers?.name || 'Unknown Supplier',
        items: d.items.map((it: any) => ({
          ...it,
          material_name: it.material_master?.name || 'Unknown Material',
        })),
      })) as PurchaseOrder[];
    },
    enabled: !!projectId,
  });
}

/** Mutation to create purchase order with items */
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      companyId,
      supplierId,
      poNumber,
      expectedDeliveryDate,
      deliveryAddress,
      currency,
      remarks,
      termsConditions,
      items,
      createdBy,
    }: {
      projectId: string;
      companyId: string;
      supplierId: string;
      poNumber: string;
      expectedDeliveryDate: string | null;
      deliveryAddress: string | null;
      currency: string;
      remarks: string | null;
      termsConditions: string | null;
      items: { material_master_id: string; qty_ordered: number; rate: number }[];
      createdBy: string;
    }) => {
      const totalAmount = items.reduce((acc, it) => acc + (it.qty_ordered * it.rate), 0);
      
      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          project_id: projectId,
          company_id: companyId,
          supplier_id: supplierId,
          po_number: poNumber,
          total_amount: totalAmount,
          expected_delivery_date: expectedDeliveryDate,
          delivery_address: deliveryAddress,
          currency,
          remarks,
          terms_conditions: termsConditions,
          created_by: createdBy,
          status: 'approved',
        })
        .select()
        .single();
      if (poErr) throw poErr;

      const itemPayload = items.map(it => ({
        purchase_order_id: po.id,
        material_master_id: it.material_master_id,
        qty_ordered: it.qty_ordered,
        rate: it.rate,
      }));

      const { error: itemsErr } = await supabase
        .from('purchase_order_items')
        .insert(itemPayload);
      if (itemsErr) throw itemsErr;

      return po;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', variables.projectId] });
    },
  });
}

/** Hook to fetch Goods Received Notes */
export function useGoodsReceivedNotes(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['goods_received_notes', projectId],
    queryFn: async (): Promise<GoodsReceivedNote[]> => {
      if (!projectId) return [];
      const { data: userProfile } = await supabase.from('profiles').select('company_id').eq('id', (await supabase.auth.getUser()).data.user?.id || '').single();
      const compId = userProfile?.company_id || '';
      
      const { data, error } = await supabase
        .from('goods_received_notes')
        .select('*, purchase_orders(po_number)')
        .eq('company_id', compId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as GoodsReceivedNote[];
    },
    enabled: !!projectId,
  });
}

/** Mutation to create Goods Received Note (GRN) with items */
export function useCreateGoodsReceivedNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      purchaseOrderId,
      grnNumber,
      receivedBy,
      deliveryChallan,
      invoiceNumber,
      vehicleNumber,
      driverName,
      driverPhone,
      inspectionStatus,
      items,
    }: {
      companyId: string;
      purchaseOrderId: string;
      grnNumber: string;
      receivedBy: string;
      deliveryChallan: string | null;
      invoiceNumber: string | null;
      vehicleNumber: string | null;
      driverName: string | null;
      driverPhone: string | null;
      inspectionStatus: 'passed' | 'failed' | 'partial';
      items: { purchase_order_item_id: string; qty_received: number; qty_accepted: number; qty_rejected: number; rejection_reason?: string; batch_number: string }[];
    }) => {
      const { data: grn, error: grnErr } = await supabase
        .from('goods_received_notes')
        .insert({
          company_id: companyId,
          purchase_order_id: purchaseOrderId,
          grn_number: grnNumber,
          received_by: receivedBy,
          delivery_challan: deliveryChallan,
          invoice_number: invoiceNumber,
          vehicle_number: vehicleNumber,
          driver_name: driverName,
          driver_phone: driverPhone,
          inspection_status: inspectionStatus,
        })
        .select()
        .single();
      if (grnErr) throw grnErr;

      const itemPayload = items.map(it => ({
        goods_received_note_id: grn.id,
        purchase_order_item_id: it.purchase_order_item_id,
        qty_received: it.qty_received,
        qty_accepted: it.qty_accepted,
        qty_rejected: it.qty_rejected,
        rejection_reason: it.rejection_reason || null,
        batch_number: it.batch_number,
      }));

      const { error: itemsErr } = await supabase
        .from('goods_received_items')
        .insert(itemPayload);
      if (itemsErr) throw itemsErr;

      return grn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods_received_notes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_ledger'] });
      queryClient.invalidateQueries({ queryKey: ['material_stock'] });
    },
  });
}
