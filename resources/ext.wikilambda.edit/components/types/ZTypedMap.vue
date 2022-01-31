<template>
	<!--
		WikiLambda Vue component for zTypedMap objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zTypedMap">
		<template v-if="requiresTypeForList">
			<z-object-selector
				:type="Constants.zType"
				:placeholder="$i18n( 'wikilambda-ztyped-map-placeholder' )"
				:readonly="readonly"
				@input="onMapTypeChange( $event, 0 )"
			></z-object-selector>
			<z-object-selector
				:type="Constants.zType"
				:placeholder="$i18n( 'wikilambda-ztyped-map-placeholder' )"
				:readonly="readonly"
				@input="onMapTypeChange( $event, 1 )"
			></z-object-selector>
		</template>
		<template v-else>
			<p>
				<strong>
					{{ $i18n( 'wikilambda-ztyped-map-description' ) }}:
				</strong>
				( {{ Key1Label }}, {{ Key2Label }} )
			</p>

			<z-typed-list
				:zobject-id="zNestedTypedList.id"
				:readonly="readonly">
			</z-typed-list>
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
module.exports = {
	name: 'z-typed-map',
	components: {
		'z-object-selector': ZObjectSelector,
		'z-typed-list': ZTypedList
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
				return this.findKeyInArray( Constants.Z_TYPED_MAP_TYPE1, this.zObjectChildrenRecursive );
			},
			zTypedMapType2: function () {
				return this.findKeyInArray( Constants.Z_TYPED_MAP_TYPE2, this.zObjectChildrenRecursive );
			},
			zNestedTypedList: function () {
				return this.findKeyInArray( Constants.Z_TYPED_OBJECT_ELEMENT_1, this.zObjectChildren );
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
		mapActions( [ 'addZObject', 'recalculateZListIndex', 'setTypeOfTypedMap', 'addTypedListItem', 'removeTypedListItem', 'fetchZKeys' ] ),
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
			this.fetchZKeys( [ this.zTypedMapType1.value, this.zTypedMapType2.value ] );
		}
	},
	beforeCreate: function () {
		this.$options.components[ 'z-object' ] = require( './../ZObject.vue' );
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
