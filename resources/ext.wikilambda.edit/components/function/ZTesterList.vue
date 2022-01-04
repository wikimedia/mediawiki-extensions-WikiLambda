<template>
	<!--
		WikiLambda Vue component for ZLists of ZTester objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
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
				@remove-item="removeItem"
			></z-tester-list-item>
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
			{{ $i18n( 'wikilambda-tester-none-found' ) }}
		</div>
		<z-tester-ad-hoc
			v-if="getNewTesterId"
			:zobject-id="getNewTesterId"
			:z-tester-list-id="zobjectId"
		></z-tester-ad-hoc>
		<button v-if="!getViewMode && !getNewTesterId" @click="createNewTester">
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
		'getNewTesterId',
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
