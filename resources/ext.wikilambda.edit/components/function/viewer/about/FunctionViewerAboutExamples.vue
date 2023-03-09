<template>
	<!--
		WikiLambda Vue component for viewing a function examples.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div v-if="exampleList.length > 0" class="ext-wikilambda-function-viewer-about-aliases">
		<wl-table
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
		</wl-table>
	</div>
</template>

<script>
var Constants = require( '../../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../../../../mixins/typeUtils.js' ),
	TableContainer = require( '../../../base/Table.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-function-viewer-about-examples',
	components: {
		'wl-table': TableContainer
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
@import '../../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-viewer-about-aliases {
	&__table {
		&-title {
			display: flex;
			align-items: center;
			height: @size-300;
			background-color: @background-color-interactive;
			padding: 0 @spacing-100;
			color: @color-base;
			font-weight: @font-weight-bold;
		}

		&-header-item {
			padding-left: @spacing-100;
			padding-right: @spacing-100;
			font-weight: @font-weight-bold;
			background-color: @background-color-interactive-subtle;
			border-top: 1px solid @border-color-subtle;
			border-right: 1px solid @border-color-subtle;
		}

		&-item {
			padding-left: @spacing-100;
			padding-right: @spacing-100;
			text-transform: capitalize;
		}
	}
}
</style>
