<template>
	<!--
		WikiLambda Vue component for Z20/Tester objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-tester">
		<!-- Function selection block -->
		<div class="ext-wikilambda-tester-function">
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
			<wl-z-object-key-value
				:key="testerCallRowId"
				:row-id="testerCallRowId"
				:edit="edit"
			></wl-z-object-key-value>
		</div>
		<!-- Tester result validation block -->
		<div
			class="ext-wikilambda-tester-content"
			role="ext-wikilambda-tester-validation"
		>
			<wl-z-object-key-value
				:key="testerValidationRowId"
				:row-id="testerValidationRowId"
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
		mapGetters( [ 'getRowByKeyPath' ] ),
		{
			/**
			 * Returns the row Id of the target function key: Z20K1
			 *
			 * @return {number|undefined}
			 */
			functionRowId: function () {
				const row = this.getRowByKeyPath( [ Constants.Z_TESTER_FUNCTION ], this.rowId );
				return ( row !== undefined ) ? row.id : undefined;
			},

			/**
			 * Returns the row Id of the tester call: Z20K2
			 *
			 * @return {number|undefined}
			 */
			testerCallRowId: function () {
				const row = this.getRowByKeyPath( [ Constants.Z_TESTER_CALL ], this.rowId );
				return ( row !== undefined ) ? row.id : undefined;
			},

			/**
			 * Returns the row Id of the tester validation function call: Z20K3
			 *
			 * @return {number|undefined}
			 */
			testerValidationRowId: function () {
				const row = this.getRowByKeyPath( [ Constants.Z_TESTER_VALIDATION ], this.rowId );
				return ( row !== undefined ) ? row.id : undefined;
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
		border-top: 1px solid @border-color-subtle;
		padding-top: @spacing-75;
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
