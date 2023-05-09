<template>
	<!--
		WikiLambda Vue component for zTypedMap objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zTypedMap">
		<template v-if="requiresTypeForList">
			<wl-z-object-selector
				:type="Constants.zType"
				:placeholder="$i18n( 'wikilambda-ztyped-map-placeholder' ).text()"
				:disabled="readonly"
				@input="onMapTypeChange( $event, 0 )"
			></wl-z-object-selector>
			<wl-z-object-selector
				:type="Constants.zType"
				:placeholder="$i18n( 'wikilambda-ztyped-map-placeholder' ).text()"
				:disabled="readonly"
				@input="onMapTypeChange( $event, 1 )"
			></wl-z-object-selector>
		</template>
		<template v-else>
			<p>
				<strong>
					{{ $i18n( 'wikilambda-ztyped-map-description' ).text() }}:
				</strong>
				( {{ Key1Label }}, {{ Key2Label }} )
			</p>

			<wl-z-typed-list
				:zobject-id="zNestedTypedList.id"
				:readonly="readonly"
			></wl-z-typed-list>
		</template>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	ZTypedList = require( './ZTypedList.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../../mixins/typeUtils.js' );

// @vue/component
module.exports = exports = {
	name: 'wl-z-typed-map',
	components: {
		'wl-z-object-selector': ZObjectSelector,
		'wl-z-typed-list': ZTypedList
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
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zObjectChildrenRecursive: function () {
				return this.getZObjectChildrenByIdRecursively( this.zobjectId );
			},
			zTypedMapType1: function () {
				var mapType = this.findKeyInArray(
					Constants.Z_TYPED_MAP_TYPE1,
					this.zObjectChildrenRecursive
				);
				if ( mapType.value === 'object' ) {
					mapType = this.findKeyInArray(
						Constants.Z_REFERENCE_ID,
						this.getZObjectChildrenById( mapType.id )
					);
				}
				return mapType;
			},
			zTypedMapType2: function () {
				var mapType = this.findKeyInArray(
					Constants.Z_TYPED_MAP_TYPE2,
					this.zObjectChildrenRecursive
				);
				if ( mapType.value === 'object' ) {
					mapType = this.findKeyInArray(
						Constants.Z_REFERENCE_ID,
						this.getZObjectChildrenById( mapType.id )
					);
				}
				return mapType;
			},
			zNestedTypedList: function () {
				return this.findKeyInArray(
					Constants.Z_TYPED_OBJECT_ELEMENT_1,
					this.zObjectChildren
				);
			},
			requiresTypeForList: function () {
				return !this.zTypedMapType1.value || !this.zTypedMapType2.value;
			},
			Key1Label: function () {
				if ( this.zTypedMapType1.value ) {
					return this.getZkeyLabels[ this.zTypedMapType1.value ];
				} else {
					return '';
				}
			},
			Key2Label: function () {
				if ( this.zTypedMapType2.value ) {
					return this.getZkeyLabels[ this.zTypedMapType2.value ];
				} else {
					return '';
				}
			}
		} ),
	methods: $.extend( {},
		mapActions( [
			'setTypeOfTypedMap',
			'removeTypedListItem',
			'fetchZKeys'
		] ),
		{
			onMapTypeChange: function ( type, index ) {
				// first we create an array with the existing value
				var types = [ this.zTypedMapType1.value, this.zTypedMapType2.value ];
				// then we update the one that triggered the event
				types[ index ] = type;
				this.setTypeOfTypedMap( { types: types, objectId: this.zobjectId } );
			},
			removeItem: function ( item ) {
				this.removeTypedListItem( item );
			}
		}
	),
	mounted: function () {
		if ( this.zTypedMapType1 && this.zTypedMapType1.value ) {
			this.fetchZKeys( { zids: [ this.zTypedMapType1.value, this.zTypedMapType2.value ] } );
		}
	},
	beforeCreate: function () {
		this.$options.components[ 'wl-z-object' ] = require( './../ZObject.vue' );
	}
};
</script>

<style lang="less">
.ext-wikilambda-zTypedMap {
	background: #eee;
	padding: 1em;
}

input.ext-wikilambda-zstring {
	background: #eef;
}

ul.ext-wikilambda-zTypedMap-no-bullets {
	list-style-type: none;
	list-style-image: none;
}

.ext-wikilambda-zTypedMap-items-heading {
	font-weight: bold;
	margin-top: 1em;
}
</style>
