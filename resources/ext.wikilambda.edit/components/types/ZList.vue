<template>
	<!--
		WikiLambda Vue component for ZList objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zlist">
		<ul>
			<z-list-item
				v-for="( item ) in ZlistItems"
				:key="item.id"
				:z-type="Constants.Z_TYPE"
				:zobject-id="item.id"
				:readonly="readonly"
				@remove-item="removeItem"
			></z-list-item>
			<li v-if="!( viewmode || readonly )">
				<button
					class="z-list-add"
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
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'z-list',
	components: {
		'z-list-item': ZListItem
	},
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
			getZObjectChildrenById: 'getZObjectChildrenById'
		} ),
		{
			ZlistItems: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			ZlistItemsLength: function () {
				return this.ZlistItems.length;
			},
			tooltipRemoveListItem: function () {
				return this.$i18n( 'wikilambda-editor-zlist-removeitem-tooltip' );
			},
			tooltipAddListItem: function () {
				this.$i18n( 'wikilambda-editor-zlist-additem-tooltip' );
			}
		} ),
	methods: $.extend( {},
		mapActions( [ 'addZObject', 'recalculateZListIndex', 'removeZObject', 'removeZObjectChildren' ] ),
		{
			addNewItem: function ( /* event */ ) {
				var payload = {
					key: this.ZlistItemsLength,
					value: 'object',
					parent: this.zobjectId
				};
				this.addZObject( payload );
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
.ext-wikilambda-zlist {
	background: #eee;
	padding: 0 0.5em;
}

input.ext-wikilambda-zstring {
	background: #eef;
}

.ext-wikilambda-zlist:before {
	content: '[';
}

.ext-wikilambda-zlist:after {
	content: ']';
}

ul.ext-wikilambda-zlist-no-bullets {
	list-style-type: none;
	list-style-image: none;
}
</style>
