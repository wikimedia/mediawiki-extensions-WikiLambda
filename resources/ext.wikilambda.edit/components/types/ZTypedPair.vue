<template>
	<!--
		WikiLambda Vue component for ZTypedPair objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zTypedPair">
		<template v-if="requiresTypeForList">
			<div>
				<label>{{ $i18n( 'wikilambda-ztyped-pair-key-label' ).text() }}:</label>
				<z-object-selector
					:type="Constants.zType"
					:placeholder="$i18n( 'wikilambda-ztyped-pair-placeholder' ).text()"
					:readonly="readonly"
					@input="onPairTypeChange( $event, 0 )"
				></z-object-selector>
			</div>
			<div>
				<label>{{ $i18n( 'wikilambda-ztyped-pair-value-label' ).text() }}:</label>
				<z-object-selector
					:type="Constants.zType"
					:placeholder="$i18n( 'wikilambda-ztyped-pair-placeholder' ).text()"
					:readonly="readonly"
					@input="onPairTypeChange( $event, 1 )"
				></z-object-selector>
			</div>
		</template>
		<template v-else>
			<div>
				<label>{{ $i18n( 'wikilambda-ztyped-pair-key-label' ).text() }}: ( {{ Key1Label }} ):</label>
				<z-object
					:zobject-id="zTypedPairKey1.id"
					:persistent="false"
					:readonly="readonly"
				></z-object>
			</div>
			<div>
				<label>{{ $i18n( 'wikilambda-ztyped-pair-value-label' ).text() }}: ( {{ Key2Label }} ):</label>
				<z-object
					:zobject-id="zTypedPairKey2.id"
					:persistent="false"
					:readonly="readonly"
				></z-object>
			</div>
		</template>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../../mixins/typeUtils.js' );

// @vue/component
module.exports = exports = {
	name: 'z-typed-pair',
	components: {
		'z-object-selector': ZObjectSelector
	},
	mixins: [ typeUtils ],
	inject: {
		viewmode: { default: false }
	},
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
			Constants: Constants
		};
	},
	computed: $.extend( {},
		mapGetters( {
			getZObjectChildrenById: 'getZObjectChildrenById',
			getZObjectChildrenByIdRecursively: 'getZObjectChildrenByIdRecursively',
			getZkeyLabels: 'getZkeyLabels'
		} ),
		{
			zObjectChildren: function () {
				return this.getZObjectChildrenByIdRecursively( this.zobjectId );
			},
			zTypedPairType1: function () {
				var mapType = this.findKeyInArray(
					Constants.Z_TYPED_PAIR_TYPE1,
					this.zObjectChildren
				);
				if ( mapType.value === 'object' ) {
					mapType = this.findKeyInArray(
						Constants.Z_REFERENCE_ID,
						this.getZObjectChildrenById( mapType.id )
					);
				}
				return mapType;
			},
			zTypedPairType2: function () {
				var mapType = this.findKeyInArray(
					Constants.Z_TYPED_PAIR_TYPE2,
					this.zObjectChildren
				);
				if ( mapType.value === 'object' ) {
					mapType = this.findKeyInArray(
						Constants.Z_REFERENCE_ID,
						this.getZObjectChildrenById( mapType.id )
					);
				}
				return mapType;
			},
			zTypedPairKey1: function () {
				return this.findKeyInArray( Constants.Z_TYPED_OBJECT_ELEMENT_1, this.zObjectChildren );
			},
			zTypedPairKey2: function () {
				return this.findKeyInArray( Constants.Z_TYPED_OBJECT_ELEMENT_2, this.zObjectChildren );
			},
			tooltipRemoveListItem: function () {
				return this.$i18n( 'wikilambda-editor-zlist-removeitem-tooltip' ).text();
			},
			tooltipAddListItem: function () {
				this.$i18n( 'wikilambda-editor-zlist-additem-tooltip' ).text();
			},
			requiresTypeForList: function () {
				return !this.zTypedPairType1.value || !this.zTypedPairType2.value;
			},
			Key1Label: function () {
				if ( this.zTypedPairType1.value ) {
					return this.getZkeyLabels[ this.zTypedPairType1.value ];
				} else {
					return '';
				}
			},
			Key2Label: function () {
				if ( this.zTypedPairType2.value ) {
					return this.getZkeyLabels[ this.zTypedPairType2.value ];
				} else {
					return '';
				}
			}
		} ),
	methods: $.extend( {},
		mapActions( [
			'setTypeOfTypedPair',
			'removeTypedListItem',
			'fetchZKeys'
		] ),
		{
			onPairTypeChange: function ( type, index ) {
				// first we create an array with the existing value
				var types = [ this.zTypedPairType1.value, this.zTypedPairType2.value ];
				// then we update the one that triggered the event
				types[ index ] = type;
				this.setTypeOfTypedPair( { types: types, objectId: this.zobjectId } );
			},
			removeItem: function ( item ) {
				this.removeTypedListItem( item );
			}
		}
	),
	mounted: function () {
		if ( this.zTypedPairType1 && this.zTypedPairType1.value ) {
			this.fetchZKeys( { zids: [ this.zTypedPairType1.value, this.zTypedPairType2.value ] } );
		}
	},
	beforeCreate: function () {
		this.$options.components[ 'z-object' ] = require( './../ZObject.vue' );
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-zTypedPair {
	background: @wmui-color-base80;
	border: 1px solid @wmui-color-base20;
	padding: 1em;
}

input.ext-wikilambda-zstring {
	background: #eef;
}

ul.ext-wikilambda-zTypedPair-no-bullets {
	list-style-type: none;
	list-style-image: none;
}

.ext-wikilambda-zTypedPair-items-heading {
	font-weight: bold;
	margin-top: 1em;
}
</style>
