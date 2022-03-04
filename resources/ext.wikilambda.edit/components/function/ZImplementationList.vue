<template>
	<!--
		WikiLambda Vue component for ZLists of ZImplementation objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<h3>
			{{ $i18n( 'wikilambda-editor-implementation-list-label' ) }}
		</h3>
		<ul class="ext-wikilambda-zlist-no-bullets">
			<z-implementation-list-item
				v-for="( item ) in ZlistItems"
				:key="item.id"
				:zobject-id="item.id"
				:viewmode="getViewMode"
				:z-type="Constants.Z_IMPLEMENTATION"
				@remove-item="removeItem"
			></z-implementation-list-item>
			<li v-if="!getViewMode">
				<button
					:title="tooltipAddListItem"
					@click="addNewItem"
				>
					{{ $i18n( 'wikilambda-editor-additem' ) }}
				</button>
			</li>
		</ul>
		<div v-if="getViewMode && ZlistItems.length <= 0">
			{{ $i18n( 'wikilambda-implementation-none-found' ) }}
		</div>
		<a :href="createNewImplementationLink">
			{{ $i18n( 'wikilambda-implementation-create-new' ) }}
		</a>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	ZList = require( '../types/ZList.vue' ),
	ZImplementationListItem = require( './ZImplementationListItem.vue' );

// @vue/component
module.exports = exports = {
	name: 'z-implementation-list',
	components: {
		'z-implementation-list-item': ZImplementationListItem
	},
	extends: ZList,
	computed: $.extend( mapGetters( [ 'getNextObjectId', 'getCurrentZObjectId', 'getViewMode' ] ),
		{
			Constants: function () {
				return Constants;
			},
			createNewImplementationLink: function () {
				return '/wiki/Special:CreateZObject?zid=Z14&Z14K1=' + this.getCurrentZObjectId;
			}
		}
	),
	methods: $.extend( mapActions( [ 'addZReference' ] ), {
		addNewItem: function ( /* event */ ) {
			var nextId = this.getNextObjectId,
				payload = {
					key: this.ZlistItemsLength,
					value: 'object',
					parent: this.zobjectId
				};
			this.addZObject( payload );

			this.addZReference( {
				value: '',
				id: nextId
			} );
		}
	} )
};
</script>
