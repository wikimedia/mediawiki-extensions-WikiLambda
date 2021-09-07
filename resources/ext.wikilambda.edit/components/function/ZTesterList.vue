<template>
	<!--
		WikiLambda Vue component for ZLists of ZTester objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<h3>{{ $i18n( 'wikilambda-editor-tester-list-label' ) }}</h3>
		<ul class="ext-wikilambda-zlist-no-bullets">
			<z-tester-list-item
				v-for="(item) in ZlistItems"
				:key="item.id"
				:zobject-id="item.id"
				:viewmode="getViewMode"
				:z-type="Constants.Z_TESTER"
			></z-tester-list-item>
			<li v-if="!getViewMode">
				<button
					:title="tooltipAddListItem"
					:disabled="!getZTesters.length"
					@click="addNewItem"
				>
					{{ $i18n( 'wikilambda-editor-additem' ) }}
				</button>
			</li>
		</ul>
		<div v-if="getViewMode && ZlistItems.length <= 0">
			{{ $i18n( 'wikilambda-tester-none-found' ) }}
		</div>
		<div v-for="tester in getNewTesterIds" :key="tester">
			<z-tester-ad-hoc
				:zobject-id="tester"
				:z-tester-list-id="zobjectId"
			></z-tester-ad-hoc>
		</div>
		<button v-if="!getViewMode && getNewTesterIds.length <= 0" @click="createNewTester">
			{{ $i18n( 'wikilambda-tester-create-new' ) }}
		</button>
		<a v-if="getViewMode" :href="createNewTesterLink">
			{{ $i18n( 'wikilambda-tester-create-new' ) }}
		</a>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	ZList = require( '../types/ZList.vue' ),
	ZTesterListItem = require( './ZTesterListItem.vue' ),
	ZTesterAdHoc = require( './ZTesterAdHoc.vue' );

module.exports = {
	extends: ZList,
	components: {
		'z-tester-list-item': ZTesterListItem,
		'z-tester-ad-hoc': ZTesterAdHoc
	},
	computed: $.extend( mapGetters( [
		'getNextObjectId',
		'getCurrentZObjectId',
		'getZTesters',
		'getNewTesterIds',
		'getViewMode'
	] ),
	{
		Constants: function () {
			return Constants;
		},
		createNewTesterLink: function () {
			return '/wiki/Special:CreateZObject?zid=Z20';
		}
	}
	),
	methods: $.extend( mapActions( [
		'addZReference',
		'initializeResultId',
		'createNewTester'
	] ), {
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
