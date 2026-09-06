-- seed_new_user() n'est appelée que par le déclencheur on_auth_user_created.
-- PostgREST expose par défaut les fonctions du schéma public via
-- /rest/v1/rpc/... : on retire ce droit pour qu'elle ne soit pas appelable
-- depuis l'extérieur (signalé par le linter de sécurité Supabase).

revoke execute on function public.seed_new_user() from public;
revoke execute on function public.seed_new_user() from anon;
revoke execute on function public.seed_new_user() from authenticated;
