CREATE TRIGGER validate_reservation_before_insert
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_reservation_insert();