<template>
	<!--
		WikiLambda Vue component for ZLists of ZArgument objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<h3>{{ $i18n( 'wikilambda-editor-argument-list-label' ) }}</h3>
		<ul class="ext-wikilambda-zlist-no-bullets">
			<z-list-item
				v-for="( item ) in ZlistItems"
				:key="item.id"
				:zobject-id="item.id"
				:viewmode="viewmode"
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
var mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	ZList = require( './ZList.vue' );

// @vue/component
module.exports = exports = {
	extends: ZList,
	computed: mapGetters( [ 'getNextObjectId' ] ),
	methods: $.extend( mapActions( [ 'addZArgument' ] ), {
		addNewItem: function ( /* event */ ) {
			var nextId = this.getNextObjectId,
				payload = {
					key: this.ZlistItemsLength,
					value: 'object',
					parent: this.zobjectId
				};
			this.addZObject( payload );

			this.addZArgument( nextId );
		}
	} )
};
</script>
