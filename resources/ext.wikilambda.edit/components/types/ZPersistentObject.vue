<template>
	<!--
		WikiLambda Vue interface module for persistent (MediaWiki-stored) ZObjects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<div>
			<h2 class="ext-wikilambda-persistentobject-header">
				{{ labelLabel }}
			</h2>
			<z-object-key
				:key="Constants.Z_PERSISTENTOBJECT_LABEL"
				:zobject-id="zObjectLabel.id"
				:parent-type="zObjectType"
				:readonly="getViewMode || readonly"
			></z-object-key>
		</div>
		<div>
			<h2 class="ext-wikilambda-persistentobject-header">
				{{ valueLabel }}
			</h2>
			<div v-if="!(getViewMode || readonly)" class="ext-wikilambda-clear-persistentobject">
				<button
					:title="$i18n( 'wikilambda-editor-zobject-clearitem-tooltip' )"
					@click="removeKey( zObjectValue.id )"
				>
					{{ $i18n( 'wikilambda-editor-clearitem' ) }}
				</button>
			</div>
			<z-object-key
				:key="Constants.Z_PERSISTENTOBJECT_VALUE"
				:zobject-id="zObjectValue.id"
				:parent-type="zObjectType"
				:readonly="getViewMode || readonly"
			></z-object-key>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	ZObjectKey = require( '../ZObjectKey.vue' );

module.exports = {
	components: {
		'z-object-key': ZObjectKey
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getZObjectTypeById',
		'getZkeyLabels',
		'getViewMode'
	] ), {
		Constants: function () {
			return Constants;
		},
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		zObjectType: function () {
			return this.getZObjectTypeById( this.zobjectId );
		},
		zObjectValue: function () {
			return this.findKeyInArray( Constants.Z_PERSISTENTOBJECT_VALUE, this.zobject );
		},
		zObjectLabel: function () {
			return this.findKeyInArray( Constants.Z_PERSISTENTOBJECT_LABEL, this.zobject );
		},
		valueLabel: function () {
			return this.getZkeyLabels[ this.zObjectValue.key ];
		},
		labelLabel: function () {
			return this.getZkeyLabels[ this.zObjectLabel.key ];
		}
	} ),
	methods: $.extend( mapActions( [
		'removeZObjectChildren'
	] ), {
		removeKey: function ( objectId ) {
			this.removeZObjectChildren( objectId );
		}
	} )
};
</script>

<style>
.ext-wikilambda-clear-persistentobject {
	float: right;
}
</style>
