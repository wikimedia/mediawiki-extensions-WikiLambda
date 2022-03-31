<template>
	<!--
		WikiLambda Vue component for ZObject references to ZTesters in ZLists.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<li class="ext-wikilambda-zlistItem">
		<cdx-button
			v-if="!( getViewMode || readonly )"
			class="z-list-item-remove"
			:destructive="true"
			:title="tooltipRemoveListItem"
			@click="$emit( 'remove-item', zobjectId )"
		>
			{{ $i18n( 'wikilambda-editor-removeitem' ).text() }}
		</cdx-button>
		<select v-if="!hasReference" @change="selectTester">
			<option disabled selected>
				{{ $i18n( "wikilambda-tester-selector" ).text() }}
			</option>
			<option
				v-for="zTesterId in getUnattachedZTesters"
				:key="zTesterId"
				:value="zTesterId"
			>
				{{ getZkeyLabels[ zTesterId ] }}
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
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'z-tester-list-item',
	components: {
		'z-reference': ZReference,
		'cdx-button': CdxButton
	},
	extends: ZListItem,
	computed: $.extend( mapGetters( [
		'getZObjectById',
		'getUnattachedZTesters',
		'getZkeyLabels',
		'getZTesterResults',
		'getViewMode'
	] ),
	{
		referenceValue: function () {
			return this.findKeyInArray( Constants.Z_REFERENCE_ID, this.zobject ).value;
		},
		hasReference: function () {
			return !!this.referenceValue;
		},
		testerStatus: function () {
			return this.getZTesterResults[ this.referenceValue ];
		}
	}
	),
	methods: $.extend( mapActions( [ 'performTest', 'fetchZKeys' ] ), {
		selectTester: function ( event ) {
			this.$store.dispatch( 'injectZObject', {
				zobject: {
					Z1K1: Constants.Z_REFERENCE,
					Z9K1: event.target.value
				},
				key: Constants.Z_IMPLEMENTATION_FUNCTION,
				id: this.zobjectId,
				parent: this.getZObjectById( this.zobjectId ).parent
			} );
		}
	} )
};
</script>
