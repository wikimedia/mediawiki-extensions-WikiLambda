-- This file is automatically generated using maintenance/generateSchemaSql.php.
-- Source: sql/table-zlanguages.json
-- Do not modify this file directly.
-- See https://www.mediawiki.org/wiki/Manual:Schema_changes
CREATE TABLE /*_*/wikilambda_zlanguages (
  wlzlangs_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  wlzlangs_zid BLOB NOT NULL, wlzlangs_language BLOB NOT NULL
);
