<template>
	<!--
		WikiLambda Vue component for ZLists of ZArgument objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<h3>{{ $i18n( 'wikilambda-editor-argument-list-label' ).text() }}</h3>
		<ul class="ext-wikilambda-zlist-no-bullets">
			<z-list-item
				v-for="( item ) in ZlistItems"
				:key="item.id"
				:zobject-id="item.id"
				:viewmode="viewmode"
			></z-list-item>
			<li v-if="!viewmode">
				<cdx-button :title="tooltipAddListItem" @click="addNewItem">
					{{ $i18n( 'wikilambda-editor-additem' ).text() }}
				</cdx-button>
			</li>
		</ul>
	</div>
</template>

<script>
var mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	ZTypedList = require( './ZTypedList.vue' );

// @vue/component
module.exports = exports = {
	components: {
		'cdx-button': CdxButton
	},
	extends: ZTypedList,
	computed: mapGetters( [ 'getNextObjectId' ] ),
	methods: $.extend( mapActions( [ 'addZArgument' ] ), {
		addNewItem: function ( /* event */ ) {
			var nextId = this.getNextObjectId,
				payload = {
					key: this.ZlistItemsLength + 1,
					value: 'object',
					parent: this.zobjectId
				};
			this.addZObject( payload );

			this.addZArgument( nextId );
		}
	} )
};
</script>
