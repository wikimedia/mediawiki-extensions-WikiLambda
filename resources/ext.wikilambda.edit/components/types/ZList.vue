<template>
	<!--
		WikiLambda Vue interface module for ZList manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zlist">
		<ul>
			<z-list-item
				v-for="(item) in ZlistItems"
				:key="item.id"
				:zobject-id="item.id"
			></z-list-item>
			<li v-if="!viewmode">
				<button :title="tooltipAddListItem" @click="addNewItem">
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

module.exports = {
	name: 'ZList',
	components: {
		'z-list-item': ZListItem
	},
	props: {
		zobjectId: {
			type: Number,
			required: true
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
			viewmode: 'getViewMode'
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
		mapActions( [ 'addZObject' ] ),
		{
			addNewItem: function ( /* event */ ) {
				var payload = {
					key: this.ZlistItemsLength,
					value: 'object',
					parent: this.zobjectId
				};
				this.addZObject( payload );
			}
		} )
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
</style>
