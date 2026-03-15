DELETE FROM public.invoices WHERE reservation_id IS NOT NULL;
DELETE FROM public.reservations;