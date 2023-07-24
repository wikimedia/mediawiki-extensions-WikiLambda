<!--
	WikiLambda Vue component for Z20/Tester objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-tester">
		<!-- Function selection block -->
		<div
			class="ext-wikilambda-tester-function"
			data-testid="z-test-function-select-container"
		>
			<wl-z-object-key-value
				:key="functionRowId"
				:row-id="functionRowId"
				:skip-indent="true"
				:edit="edit"
			></wl-z-object-key-value>
		</div>
		<!-- Tester call block -->
		<div
			class="ext-wikilambda-tester-content"
			role="ext-wikilambda-tester-call"
		>
			<div class="ext-wikilambda-key-block">
				<label>{{ testerCallLabel }}</label>
			</div>
			<wl-z-object-key-value
				:key="testerCallRowId"
				:skip-key="true"
				:row-id="testerCallRowId"
				:error-id="testerCallRowId"
				:edit="edit"
			></wl-z-object-key-value>
		</div>
		<!-- Tester result validation block -->
		<div
			class="ext-wikilambda-tester-content"
			role="ext-wikilambda-tester-validation"
		>
			<div class="ext-wikilambda-key-block">
				<label>{{ testerValidationLabel }}</label>
			</div>
			<wl-z-object-key-value
				:key="testerValidationRowId"
				:skip-key="true"
				:row-id="testerValidationRowId"
				:error-id="testerValidationRowId"
				:edit="edit"
			></wl-z-object-key-value>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-tester',
	components: {
		// Leave components as an empty object to add the ZObjectKeyValue later
	},
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	computed: $.extend(
		mapGetters( [
			'getLabel',
			'getZTesterFunctionRowId',
			'getZTesterCallRowId',
			'getZTesterValidationRowId'
		] ),
		{
			/**
			 * Returns the row Id of the target function key: Z20K1
			 *
			 * @return {number|undefined}
			 */
			functionRowId: function () {
				return this.getZTesterFunctionRowId( this.rowId );
			},

			/**
			 * Returns the row Id of the tester call: Z20K2
			 *
			 * @return {number|undefined}
			 */
			testerCallRowId: function () {
				return this.getZTesterCallRowId( this.rowId );
			},

			/**
			 * Returns the row Id of the tester validation function call: Z20K3
			 *
			 * @return {number|undefined}
			 */
			testerValidationRowId: function () {
				return this.getZTesterValidationRowId( this.rowId );
			},

			/**
			 * Returns the human readable label for the tester call
			 *
			 * @return {string}
			 */
			testerCallLabel: function () {
				return this.getLabel( Constants.Z_TESTER_CALL );
			},

			/**
			 * Returns the human readable label for the tester validation
			 *
			 * @return {string}
			 */
			testerValidationLabel: function () {
				return this.getLabel( Constants.Z_TESTER_VALIDATION );
			}
		}
	),
	beforeCreate: function () {
		// Need to delay require of ZObjectKeyValue to avoid loop
		this.$options.components[ 'wl-z-object-key-value' ] = require( './ZObjectKeyValue.vue' );
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-tester {
	.ext-wikilambda-tester-content {
		padding-top: @spacing-75;

		> .ext-wikilambda-key-block {
			margin-bottom: 0;

			label {
				font-weight: bold;
				color: @color-base;
			}
		}
	}

	.ext-wikilambda-tester-function {
		.ext-wikilambda-key-block {
			margin-bottom: 0;

			label {
				font-weight: bold;
				color: @color-base;
			}
		}
	}
}
</style>
