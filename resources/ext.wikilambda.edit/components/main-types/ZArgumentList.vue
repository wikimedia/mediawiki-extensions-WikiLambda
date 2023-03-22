<template>
	<!--
		WikiLambda Vue component for ZLists of ZArgument objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<h3>{{ $i18n( 'wikilambda-editor-argument-list-label' ).text() }}</h3>
		<ul class="ext-wikilambda-zlist-no-bullets ext-wikilambda-zargumentlist">
			<wl-z-list-item
				v-for="( item ) in ZlistItems"
				:key="item.id"
				:zobject-id="item.id"
				:viewmode="viewmode"
				@remove-item="removeItem"
			></wl-z-list-item>
			<li v-if="!viewmode">
				<cdx-button :title="tooltipAddListItem" @click="addNewItem">
					{{ $i18n( 'wikilambda-editor-additem' ).text() }}
				</cdx-button>
			</li>
		</ul>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	ZTypedList = require( './ZTypedList.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-z-argument-list',
	components: {
		'cdx-button': CdxButton
	},
	extends: ZTypedList,
	computed: mapGetters( [ 'getNextObjectId' ] ),
	methods: $.extend( mapActions(
		[
			'changeType',
			'removeZObjectChildren',
			'removeZObject',
			'recalculateZArgumentList',
			'setIsZObjectDirty'
		] ), {
		addNewItem: function ( /* event */ ) {
			this.changeType( {
				type: Constants.Z_ARGUMENT,
				id: this.zobjectId,
				append: true
			} );
			this.setIsZObjectDirty( true );
		},
		removeItem: function ( itemId ) {
			this.removeZObjectChildren( itemId );
			this.removeZObject( itemId );
			this.recalculateZArgumentList( this.zobjectId );
			this.setIsZObjectDirty( true );
		}
	} )
};
</script>
