<template>
	<!--
		WikiLambda Vue component for ZObject references to ZImplementations in ZLists.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<li class="ext-wikilambda-zlistItem">
		<button v-if="!(viewmode || readonly)"
			:title="tooltipRemoveListItem"
			@click="removeItem"
		>
			{{ $i18n( 'wikilambda-editor-removeitem' ) }}
		</button>
		<select v-if="!hasReference" @change="selectImplementation">
			<option disabled selected>
				{{ $i18n( "wikilambda-implementation-selector" ) }}
			</option>
			<option
				v-for="zImplementationId in getZImplementations"
				:key="zImplementationId"
				:value="zImplementationId"
			>
				{{ getZkeyLabels[ zImplementationId ] }} ({{ zImplementationId }})
			</option>
		</select>
		<z-reference
			v-else
			:zobject-id="zobjectId"
			:search-type="zType"
			:readonly="true"
		></z-reference>
	</li>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZListItem = require( '../types/ZListItem.vue' ),
	ZReference = require( '../types/ZReference.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	extends: ZListItem,
	components: {
		'z-reference': ZReference
	},
	computed: $.extend( mapGetters( [ 'getZObjectById', 'getZImplementations', 'getZkeyLabels' ] ),
		{
			hasReference: function () {
				return !!this.findKeyInArray( Constants.Z_REFERENCE_ID, this.zobject ).value;
			}
		}
	),
	methods: {
		selectImplementation: function ( event ) {
			this.$store.dispatch( 'injectZObject', {
				zobject: {
					Z1K1: 'Z9',
					Z9K1: event.target.value
				},
				key: 'Z14K1',
				id: this.zobjectId,
				parent: this.getZObjectById( this.zobjectId ).parent
			} );
		}
	}
};
</script>
