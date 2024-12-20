-- This file is automatically generated using maintenance/generateSchemaSql.php.
-- Source: sql/table-ztester_results.json
-- Do not modify this file directly.
-- See https://www.mediawiki.org/wiki/Manual:Schema_changes
CREATE TABLE /*_*/wikilambda_ztester_results (
  wlztr_id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  wlztr_zfunction_zid VARBINARY(32) NOT NULL,
  wlztr_zfunction_revision INT UNSIGNED NOT NULL,
  wlztr_zimplementation_zid VARBINARY(32) NOT NULL,
  wlztr_zimplementation_revision INT UNSIGNED NOT NULL,
  wlztr_ztester_zid VARBINARY(32) NOT NULL,
  wlztr_ztester_revision INT UNSIGNED NOT NULL,
  wlztr_pass TINYINT DEFAULT 1 NOT NULL,
  wlztr_returnobject MEDIUMBLOB NOT NULL,
  INDEX wlztr_lookup (
    wlztr_zfunction_zid, wlztr_zimplementation_zid,
    wlztr_ztester_zid
  ),
  UNIQUE INDEX wlztr_revisions_unique (
    wlztr_zfunction_revision, wlztr_zimplementation_revision,
    wlztr_ztester_revision
  ),
  PRIMARY KEY(wlztr_id)
) /*$wgDBTableOptions*/;
