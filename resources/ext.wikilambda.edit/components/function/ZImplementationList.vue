<template>
	<!--
		WikiLambda Vue component for ZLists of ZImplementation objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<h3>
			{{ $i18n( 'wikilambda-editor-implementation-list-label' ).text() }}
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
				<cdx-button
					:title="tooltipAddListItem"
					@click="addNewItem"
				>
					{{ $i18n( 'wikilambda-editor-additem' ).text() }}
				</cdx-button>
			</li>
		</ul>
		<div v-if="getViewMode && ZlistItems.length <= 0">
			{{ $i18n( 'wikilambda-implementation-none-found' ).text() }}
		</div>
		<a :href="createNewImplementationLink">
			{{ $i18n( 'wikilambda-implementation-create-new' ).text() }}
		</a>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	ZTypedList = require( '../types/ZTypedList.vue' ),
	ZImplementationListItem = require( './ZImplementationListItem.vue' );

// @vue/component
module.exports = exports = {
	name: 'z-implementation-list',
	components: {
		'z-implementation-list-item': ZImplementationListItem,
		'cdx-button': CdxButton
	},
	extends: ZTypedList,
	computed: $.extend( mapGetters( [ 'getNextObjectId', 'getCurrentZObjectId', 'getViewMode' ] ),
		{
			Constants: function () {
				return Constants;
			},
			createNewImplementationLink: function () {
				return new mw.Title( 'Special:CreateZObject' ).getUrl() + `?zid=${Constants.Z_IMPLEMENTATION}&${Constants.Z_IMPLEMENTATION_FUNCTION}=${this.getCurrentZObjectId}`;
			}
		}
	),
	methods: $.extend( mapActions( [ 'addZReference' ] ), {
		addNewItem: function ( /* event */ ) {
			var nextId = this.getNextObjectId,
				payload = {
					// since first item is type, new key is items length + 1
					key: this.ZlistItemsLength + 1,
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
