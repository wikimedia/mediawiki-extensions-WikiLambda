-- This file is automatically generated using maintenance/generateSchemaSql.php.
-- Source: extensions/WikiLambda/includes/sql/table-zobject_labels.json
-- Do not modify this file directly.
-- See https://www.mediawiki.org/wiki/Manual:Schema_changes
CREATE TABLE /*_*/wikilambda_zobject_labels (
  wlzl_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  wlzl_zobject_zid BLOB NOT NULL, wlzl_type BLOB NOT NULL,
  wlzl_language BLOB NOT NULL, wlzl_label BLOB NOT NULL,
  wlzl_label_normalised BLOB NOT NULL,
  wlzl_label_primary SMALLINT DEFAULT 1 NOT NULL
);

CREATE INDEX wlzl_label_searchindex ON /*_*/wikilambda_zobject_labels (
  wlzl_type, wlzl_language, wlzl_label_normalised
);

CREATE INDEX wlzl_label_searchindex_strict ON /*_*/wikilambda_zobject_labels (
  wlzl_type, wlzl_language, wlzl_label
);