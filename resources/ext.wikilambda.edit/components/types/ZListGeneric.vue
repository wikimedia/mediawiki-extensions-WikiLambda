<template>
	<!--
		WikiLambda Vue component for ZList objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zlistGeneric">
		<z-object-selector
			v-if="requiresGenericTypes"
			:type="Constants.zType"
			:placeholder="$i18n( 'wikilambda-zlist-generic-type-placeholder' )"
			:readonly="readonly"
			@input="onGenericTypeChange"
		></z-object-selector>
		<p v-else>
			<strong>{{ $i18n( 'wikilambda-zlist-generic-type-description' ) }}:</strong> {{ genericTypeLabel }}
		</p>
		<div v-if="!requiresGenericTypes" class="ext-wikilambda-zlistGeneric-items-heading">
			{{ $i18n( 'wikilambda-zlist-generic-type-items' ) }}:
		</div>
		<ul class="ext-wikilambda-zlistGeneric-no-bullets">
			<z-list-item
				v-for="(item) in zListItems"
				:key="item.id"
				:zobject-id="item.id"
				:z-type="zListGenericType"
				:readonly="readonly || requiresGenericTypes"
				@remove-item="removeItem( item )"
			></z-list-item>
			<li v-if="!(viewmode || readonly || requiresGenericTypes)">
				<button class="z-list-add"
					:title="tooltipAddListItem"
					@click="addNewItem"
				>
					{{ $i18n( 'wikilambda-editor-additem' ) }}
				</button>
			</li>
		</ul>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZListItem = require( './ZListItem.vue' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../../mixins/typeUtils.js' );

module.exports = {
	name: 'ZListGeneric',
	components: {
		'z-list-item': ZListItem,
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
			zListItems: function () {
				var nestedChildren = this.zObjectChildren;
				return nestedChildren.filter( function ( child ) {
					return child.key === 'K1';
				} );
			},
			zListGenericType: function () {
				return this.findKeyInArray( Constants.Z_LIST_GENERIC_TYPE, this.zObjectChildren ).value;
			},
			tooltipRemoveListItem: function () {
				return this.$i18n( 'wikilambda-editor-zlist-removeitem-tooltip' );
			},
			tooltipAddListItem: function () {
				this.$i18n( 'wikilambda-editor-zlist-additem-tooltip' );
			},
			requiresGenericTypes: function () {
				return !this.zListGenericType;
			},
			genericTypeLabel: function () {
				if ( !this.requiresGenericTypes ) {
					return this.getZkeyLabels[ this.zListGenericType ];
				} else {
					return '';
				}
			}
		} ),
	methods: $.extend( {},
		mapActions( [ 'addZObject', 'recalculateZListIndex', 'setTypeOfGenericType', 'addGenericTypeItem', 'removeGenericTypeItem' ] ),
		{
			addNewItem: function () {

				this.addGenericTypeItem( {
					id: this.zobjectId,
					zObjectChildren: this.zObjectChildren
				} );
			},
			onGenericTypeChange: function ( type ) {
				this.setTypeOfGenericType( { type: type, objectId: this.zobjectId } );
			},
			removeItem: function ( item ) {
				this.removeGenericTypeItem( item );
			}
		} )
};
</script>

<style lang="less">
.ext-wikilambda-zlistGeneric {
	background: #eee;
	padding: 1em;
}

input.ext-wikilambda-zstring {
	background: #eef;
}

ul.ext-wikilambda-zlistGeneric-no-bullets {
	list-style-type: none;
	list-style-image: none;
}

.ext-wikilambda-zlistGeneric-items-heading {
	font-weight: bold;
	margin-top: 1em;
}
</style>
