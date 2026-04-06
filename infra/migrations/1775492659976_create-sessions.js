/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable("sessions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    token: {
      type: "varchar(96)",
      notNull: true,
      unique: true,
    },

    user_id: {
      type: "uuid",
      notNull: true,
      // references: '"users"',
      // onDelete: "cascade", // If the user is deleted, delete the session.
    },

    // The session token is valid for 30 days.
    // This is a common practice to ensure that sessions are not valid indefinitely.
    expires_at: {
      type: "timestamptz",
      notNull: true,
    },

    // Track when the user was created and updated.
    // Why timestamp with timezone: https://justatheory.com/2012/04/postgres-use-timestamptz/
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },

    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });

  // Otimiza buscas de sessoes ativas por usuario (filtro por usuario + expiracao).
  pgm.createIndex("sessions", ["user_id", "expires_at"], {
    name: "sessions_user_id_expires_at_idx",
  });

  // Otimiza varreduras por expiracao (ex.: limpeza de sessoes expiradas).
  pgm.createIndex("sessions", "expires_at", {
    name: "sessions_expires_at_idx",
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = false;
