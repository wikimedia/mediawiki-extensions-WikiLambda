<template>
	<!--
		WikiLambda Vue component for viewing a function examples.

		@copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-viewer-about-aliases">
		<function-viewer-about-examples-table
			:header="header"
			:body="exampleList"
		>
			<template #table-title>
				<div
					class="ext-wikilambda-function-viewer-about-aliases__table-title"
				>
					{{ title }}
				</div>
			</template>
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
				input: {
					title: this.$i18n( 'wikilambda-editor-input-default-label' ).text(),
					class: 'ext-wikilambda-function-viewer-about-aliases__table-header-item'
				},
				output: {
					title: this.$i18n( 'wikilambda-editor-output-title' ).text(),
					class: 'ext-wikilambda-function-viewer-about-aliases__table-header-item'
				}
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
			if ( !zObjectValue || !zObjectValue[ Constants.Z_PERSISTENTOBJECT_VALUE ][
				Constants.Z_FUNCTION_TESTERS ] ) {
				return [];
			}

			// remove first item cause it is the type
			return this.getTestInputOutputByZIDs(
				zObjectValue[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_TESTERS ].slice( 1 )
			).map( function ( example ) {
				return {
					input: {
						title: example.input,
						class: 'ext-wikilambda-function-viewer-about-aliases__table-item'
					},
					output: {
						title: example.output || '',
						class: 'ext-wikilambda-function-viewer-about-aliases__table-item'
					}
				};
			} );
		}
	} )
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-viewer-about-aliases {
	&__table {
		&-title {
			background-color: @wmui-color-base80;
			padding: 15px 16px;
			color: @wmui-color-base0;
			font-weight: @font-weight-bold;
		}

		&-header-item {
			padding-left: 16px;
			padding-right: 16px;
			font-weight: @font-weight-bold;
			background-color: @wmui-color-base90;
			border-top: 1px solid @wmui-color-base80;
			border-right: 1px solid @wmui-color-base80;
		}

		&-item {
			padding-left: 16px;
			padding-right: 16px;
			text-transform: capitalize;
		}
	}
}
</style>
