<template>
	<!--
		WikiLambda Vue component for viewing a function examples.

		@copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-viewer-about-aliases">
		<function-viewer-about-examples-table
			:title="title"
			:header="header"
			:body="exampleList"
		>
		</function-viewer-about-examples-table>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../../../mixins/typeUtils.js' ),
	TableContainer = require( '../../../components/base/Table.vue' );

// @vue/component
module.exports = exports = {
	name: 'function-viewer-about-examples',
	components: {
		'function-viewer-about-examples-table': TableContainer
	},
	mixins: [ typeUtils ],
	data: function () {
		return {
			title: this.$i18n( 'wikilambda-function-definition-example-title' ).text(),
			header: {
				input: this.$i18n( 'wikilambda-editor-input-default-label' ).text(),
				output: this.$i18n( 'wikilambda-editor-output-title' ).text()
			}
		};
	},
	computed: $.extend( mapGetters( [
		'getCurrentZObjectId',
		'getZkeys',
		'getTestInputOutputByZIDs'
	] ), {
		exampleList: function () {
			var zObjectValue = this.getZkeys[ this.getCurrentZObjectId ];
			if ( !zObjectValue ) {
				return [];
			}
			return this.getTestInputOutputByZIDs(
				zObjectValue[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_TESTERS ]
			);
		}
	} )
};
</script>
