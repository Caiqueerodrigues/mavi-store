INSERT INTO "users" (
  "name",
  "email",
  "password_hash",
  "role",
  "active",
  "must_change_password",
  "created_at",
  "updated_at"
) VALUES (
  'Caique Rodrigues Almeida',
  'caiquerodriguesalmeida@gmail.com',
  '$2b$12$pqz5SplEj6MKNLthaTkhNO03QJ4vevQdTpf6GsKu0XDNKFlRUFhhu',
  'admin',
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET
  "name" = EXCLUDED."name",
  "password_hash" = EXCLUDED."password_hash",
  "role" = EXCLUDED."role",
  "active" = true,
  "must_change_password" = true,
  "deleted_at" = NULL,
  "updated_at" = NOW();
