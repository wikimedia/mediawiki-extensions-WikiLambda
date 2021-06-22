<template>
	<!--
		WikiLambda Vue component for ZLists of ZImplementation objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		{{ $i18n( 'wikilambda-editor-implementation-list-label' ) }}:
		<ul>
			<z-implementation-list-item
				v-for="(item) in ZlistItems"
				:key="item.id"
				:zobject-id="item.id"
				:viewmode="viewmode"
				:z-type="Constants.Z_IMPLEMENTATION"
			></z-implementation-list-item>
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
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	ZList = require( './ZList.vue' ),
	ZImplementationListItem = require( './ZImplementationListItem.vue' );

module.exports = {
	extends: ZList,
	components: {
		'z-implementation-list-item': ZImplementationListItem
	},
	computed: $.extend( mapGetters( [ 'getNextObjectId' ] ),
		{
			Constants: function () {
				return Constants;
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
