-- This file is automatically generated using maintenance/generateSchemaChangeSql.php.
-- Source: sql/abstractSchemaChanges/patch-add-zobject-join-type-index.json
-- Do not modify this file directly.
-- See https://www.mediawiki.org/wiki/Manual:Schema_changes
CREATE INDEX wlzo_index_related_type ON /*_*/wikilambda_zobject_join (wlzo_related_type);
