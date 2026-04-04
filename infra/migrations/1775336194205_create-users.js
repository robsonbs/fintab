exports.up = (pgm) => {
  pgm.createTable("users", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    // For reference, GitHub usernames can have up to 39 characters.
    // https://docs.github.com/en/rest/reference/users#get-a-user
    username: {
      type: "varchar(32)",
      unique: true,
      notNull: true,
    },
    // For reference, email addresses can have up to 254 characters.
    // https://stackoverflow.com/a/1199238
    email: {
      type: "varchar(254)",
      unique: true,
      notNull: true,
    },
    // For security purposes, passwords should be hashed and salted.
    // For reference, bcrypt hashes have 60 characters.
    // https://www.npmjs.com/package/bcrypt#hash-info
    password: {
      type: "varchar(60)",
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
};

exports.down = false;
