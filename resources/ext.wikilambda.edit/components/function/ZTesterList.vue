<template>
	<!--
		WikiLambda Vue component for ZLists of ZTester objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		{{ $i18n( 'wikilambda-editor-tester-list-label' ) }}:
		<ul>
			<z-tester-list-item
				v-for="(item) in ZlistItems"
				:key="item.id"
				:zobject-id="item.id"
				:viewmode="viewmode"
				:z-type="Constants.Z_TESTER"
			></z-tester-list-item>
			<li v-if="!viewmode">
				<button
					:title="tooltipAddListItem"
					:disabled="!getZTesters.length"
					@click="addNewItem"
				>
					{{ $i18n( 'wikilambda-editor-additem' ) }}
				</button>
			</li>
		</ul>
		<div v-if="viewmode && ZlistItems.length <= 0">
			{{ $i18n( 'wikilambda-tester-none-found' ) }}
		</div>
		<a :href="createNewTesterLink" target="_blank">
			{{ $i18n( 'wikilambda-tester-create-new' ) }}
		</a>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	ZList = require( '../types/ZList.vue' ),
	ZTesterListItem = require( './ZTesterListItem.vue' );

module.exports = {
	extends: ZList,
	components: {
		'z-tester-list-item': ZTesterListItem
	},
	computed: $.extend( mapGetters( [ 'getNextObjectId', 'getCurrentZObjectId', 'getZTesters' ] ),
		{
			Constants: function () {
				return Constants;
			},
			createNewTesterLink: function () {
				return '/wiki/Special:CreateZObject?zid=Z20';
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
