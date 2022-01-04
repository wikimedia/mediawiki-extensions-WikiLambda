<template>
	<!--
		WikiLambda Vue component for ZList objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zTypedList">
		<z-object-selector
			v-if="requiresTypeForList"
			:type="Constants.zType"
			:placeholder="$i18n( 'wikilambda-ztyped-list-placeholder' )"
			:readonly="readonly"
			@input="onTypedListChange"
		></z-object-selector>
		<p v-else>
			<strong>{{ $i18n( 'wikilambda-ztyped-list-description' ) }}:</strong> {{ TypedListLabel }}
		</p>
		<div v-if="!requiresTypeForList" class="ext-wikilambda-zTypedList-items-heading">
			{{ $i18n( 'wikilambda-ztyped-list-items' ) }}:
		</div>
		<ul class="ext-wikilambda-zTypedList-no-bullets">
			<z-list-item
				v-for="(item) in zListItems"
				:key="item.id"
				:zobject-id="item.id"
				:z-type="zTypedListType"
				:readonly="readonly || requiresTypeForList"
				@remove-item="removeItem( item )"
			></z-list-item>
			<li v-if="!(viewmode || readonly || requiresTypeForList)">
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
	name: 'ZTypedList',
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
					return child.key === Constants.Z_TYPED_LIST_ELEMENT;
				} );
			},
			zTypedListType: function () {
				return this.findKeyInArray( Constants.Z_TYPED_LIST_TYPE, this.zObjectChildren ).value;
			},
			tooltipRemoveListItem: function () {
				return this.$i18n( 'wikilambda-editor-zlist-removeitem-tooltip' );
			},
			tooltipAddListItem: function () {
				this.$i18n( 'wikilambda-editor-zlist-additem-tooltip' );
			},
			requiresTypeForList: function () {
				return !this.zTypedListType;
			},
			TypedListLabel: function () {
				if ( !this.requiresTypeForList ) {
					return this.getZkeyLabels[ this.zTypedListType ];
				} else {
					return '';
				}
			}
		} ),
	methods: $.extend( {},
		mapActions( [ 'addZObject', 'recalculateZListIndex', 'setTypeOfTypedList', 'addTypedListItem', 'removeTypedListItem', 'fetchZKeys' ] ),
		{
			addNewItem: function () {

				this.addTypedListItem( {
					id: this.zobjectId,
					zObjectChildren: this.zObjectChildren
				} );
			},
			onTypedListChange: function ( type ) {
				this.setTypeOfTypedList( { type: type, objectId: this.zobjectId } );
			},
			removeItem: function ( item ) {
				this.removeTypedListItem( item );
			}
		}
	),
	mounted: function () {
		if ( this.zTypedListType ) {
			this.fetchZKeys( [ this.zTypedListType ] );
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-zTypedList {
	background: #eee;
	padding: 1em;
}

input.ext-wikilambda-zstring {
	background: #eef;
}

ul.ext-wikilambda-zTypedList-no-bullets {
	list-style-type: none;
	list-style-image: none;
}

.ext-wikilambda-zTypedList-items-heading {
	font-weight: bold;
	margin-top: 1em;
}
</style>
