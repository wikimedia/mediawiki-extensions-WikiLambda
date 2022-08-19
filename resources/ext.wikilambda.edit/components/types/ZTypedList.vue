<template>
	<!--
		WikiLambda Vue component for ZList objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-ztypedlist">
		<div class="ext-wikilambda-ztypedlist__container">
			<ul>
				<z-list-item
					v-for="( item ) in ZlistItems"
					:key="item.id"
					:z-type="Constants.Z_TYPE"
					:zobject-id="item.id"
					:ztype-id="item.id"
					:readonly="readonly"
					@remove-item="removeItem"
				></z-list-item>
				<li v-if="!( viewmode || readonly )">
					<cdx-button
						class="z-list-add"
						:title="tooltipAddListItem"
						@click="addNewItem"
					>
						{{ $i18n( 'wikilambda-editor-additem' ).text() }}
					</cdx-button>
				</li>
			</ul>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZListItem = require( './ZListItem.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../../mixins/typeUtils.js' );

// @vue/component
module.exports = exports = {
	name: 'z-typed-list',
	components: {
		'z-list-item': ZListItem,
		'cdx-button': CdxButton
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
			getListTypeById: 'getListTypeById',
			getZObjectChildrenById: 'getZObjectChildrenById',
			getAllItemsFromListById: 'getAllItemsFromListById'
		} ),
		{
			ZlistTypeId: function () {
				return this.getListTypeById( this.zobjectId );
			},
			ZListType: function () {
				return this.findKeyInArray(
					Constants.Z_REFERENCE_ID,
					this.getZObjectChildrenById( this.ZlistTypeId.id ) );
			},
			ZlistItems: function () {
				return this.getAllItemsFromListById( this.zobjectId );
			},
			ZlistItemsLength: function () {
				return this.ZlistItems.length;
			},
			tooltipRemoveListItem: function () {
				return this.$i18n( 'wikilambda-editor-zlist-removeitem-tooltip' ).text();
			},
			tooltipAddListItem: function () {
				this.$i18n( 'wikilambda-editor-zlist-additem-tooltip' ).text();
			}
		} ),
	methods: $.extend( {},
		mapActions( [
			'addZObject', 'recalculateZListIndex', 'removeZObject', 'removeZObjectChildren', 'addTypetoList', 'changeType'
		] ),
		{
			onTypedListChange: function ( type ) {
				this.addTypetoList( { type: type, objectId: this.zobjectId } );
			},
			addNewItem: function ( /* event */ ) {
				var payload = {
					// since first item is type, new key is items length + 1
					key: `${this.ZlistItemsLength + 1}`,
					value: 'object',
					parent: this.zobjectId
				};

				var zListType = this.ZListType.value;
				this.addZObject( payload ).then( function ( zobjectId ) {
					this.changeType( {
						type: zListType,
						id: zobjectId
					} );
				}.bind( this ) );
			},
			/**
			 * Remove this item form the ZList
			 *
			 * @param {number} itemId
			 */
			removeItem: function ( itemId ) {
				this.removeZObjectChildren( itemId );
				this.removeZObject( itemId );
			}
		} ),
	watch: {
		ZlistItems: function ( list, prevList ) {
			if ( list.length < prevList.length ) {
				this.recalculateZListIndex( this.zobjectId );
			}
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-ztypedlist {
	background: #eee;
	padding: 0 0.5em;
}

input.ext-wikilambda-zstring {
	background: #eef;
}

.ext-wikilambda-ztypedlist__container:before {
	content: '[';
}

.ext-wikilambda-ztypedlist__container:after {
	content: ']';
}

ul.ext-wikilambda-ztypedlist-no-bullets {
	list-style-type: none;
	list-style-image: none;
}
</style>
