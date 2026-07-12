alter table public.deliveries add column if not exists challan_pdf_path text;

comment on column public.deliveries.challan_pdf_path is
  'Storage path of the delivery challan PDF for admin and supervisor review.';
