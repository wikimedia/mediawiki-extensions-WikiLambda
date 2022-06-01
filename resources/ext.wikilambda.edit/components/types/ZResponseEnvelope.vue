<template>
	<!--
		WikiLambda Vue component for ZResponseEnvelope objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zresponseenvelope">
		<div>
			<z-object-key
				:zobject-id="zValue.id"
				:parent-type="Constants.Z_RESPONSEENVELOPE"
				:readonly="readonly"
			></z-object-key>
		</div>
		<div class="ext-wikilambda-zresponseenvelope__show-more">
			<cdx-button
				@click.prevent="showSecond = !showSecond"
			>
				Show More
			</cdx-button>
		</div>
		<div v-if="showSecond">
			<hr>
			<z-object-key
				:zobject-id="zErrors.id"
				:parent-type="Constants.Z_RESPONSEENVELOPE"
				:readonly="readonly"
			></z-object-key>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	ZObjectKey = require( '../ZObjectKey.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	components: {
		'z-object-key': ZObjectKey,
		'cdx-button': CdxButton
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
	data: function () {
		return {
			showSecond: false
		};
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getNestedZObjectById'
	] ), {
		Constants: function () {
			return Constants;
		},
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		zValue: function () {
			return this.findKeyInArray( Constants.Z_RESPONSEENVELOPE_VALUE, this.zobject );
		},
		zMetaData: function () {
			return this.findKeyInArray( Constants.Z_RESPONSEENVELOPE_METADATA, this.zobject );
		},
		zErrors: function () {
			const metadata = this.zMetaData;
			const errors = this.isZError( metadata.id ) ? metadata : this.getZMapValue( metadata.id, 'errors' );
			return errors;
		}
	} ),
	methods: {
		isZError: function ( zobjectId ) {
			const zType = this.getNestedZObjectById( zobjectId,
				[ Constants.Z_OBJECT_TYPE, Constants.Z_REFERENCE_ID ] );
			return zType.value === Constants.Z_ERROR;
		},
		getZMapValue: function ( zMapId, key ) {
			const listOfPairs = this.getNestedZObjectById( zMapId, [ Constants.Z_TYPED_OBJECT_ELEMENT_1 ] );
			const elements = this.getZObjectChildrenById( listOfPairs.id );
			for ( const pair of elements ) {
				if ( this.getNestedZObjectById( pair.id,
					[ Constants.Z_TYPED_OBJECT_ELEMENT_1, Constants.Z_STRING_VALUE ] ).value === key ) {
					return this.getNestedZObjectById( pair.id, [ Constants.Z_TYPED_OBJECT_ELEMENT_2 ] );
				}
			}
			return false;
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-zresponseenvelope {
	&__show-more {
		padding: 10px 0;
	}
}
</style>
