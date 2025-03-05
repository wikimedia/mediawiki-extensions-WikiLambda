<template>
	<div
		class="ext-wikilambda-app-key-value-block"
		:class="rootClasses"
		data-testid="key-value-block">
		<!-- Pre Column -->
		<!-- If there are pre-buttons from the slot, render them -->
		<div v-if="$slots['pre-buttons']" class="ext-wikilambda-app-key-value-block__pre">
			<div class="ext-wikilambda-app-key-value-block__pre-buttons">
				<slot name="pre-buttons"></slot>
			</div>
		</div>
		<!-- otherwise, render the expanded toggle button -->
		<div v-else-if="hasPreColumn" class="ext-wikilambda-app-key-value-block__pre">
			<div class="ext-wikilambda-app-key-value-block__pre-buttons">
				<wl-expanded-toggle
					class="ext-wikilambda-app-key-value-block__pre-button"
					:class="expandToggleClass"
					:has-expanded-mode="hasExpandedMode"
					:expanded="expanded"
					@toggle-expand="toggleExpand"
				></wl-expanded-toggle>
			</div>
			<div
				v-if="hasExpandedBorder"
				class="ext-wikilambda-app-key-value-block__pre-border"></div>
		</div>

		<div
			class="ext-wikilambda-app-key-value-block__main"
			:class="{ 'ext-wikilambda-app-key-value-block__main--no-indent': noIndent }">
			<!-- Key Section -->
			<wl-key-block
				v-if="$slots.key"
				:type="keyType"
				class="ext-wikilambda-app-key-value-block__key"
				:key-bold="keyBold">
				<slot name="key"></slot>
			</wl-key-block>
			<!-- Value Section -->
			<div
				class="ext-wikilambda-app-key-value-block__value"
				:class="{ 'ext-wikilambda-app-field-overrides': fieldOverrides }">
				<slot name="value"></slot>
			</div>
			<!-- Footer Section -->
			<div v-if="$slots.footer" class="ext-wikilambda-app-key-value-block__footer">
				<slot name="footer"></slot>
			</div>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const errorMixin = require( '../../mixins/errorMixin.js' );
const ExpandedToggle = require( './ExpandedToggle.vue' );
const KeyBlock = require( './KeyBlock.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-key-value-block',
	components: {
		'wl-expanded-toggle': ExpandedToggle,
		'wl-key-block': KeyBlock
	},
	mixins: [ errorMixin ],
	props: {
		depth: {
			type: Number,
			required: false,
			default: undefined
		},
		edit: {
			type: Boolean,
			required: false,
			default: false
		},
		disableEdit: {
			type: Boolean,
			required: false,
			default: false
		},
		expanded: {
			type: Boolean,
			required: false,
			default: false
		},
		hasExpandedBorder: {
			type: Boolean,
			required: false,
			default: false
		},
		hasExpandedMode: {
			type: Boolean,
			required: false,
			default: false
		},
		hasPreColumn: {
			type: Boolean,
			required: false,
			default: false
		},
		noIndent: {
			type: Boolean,
			required: false,
			default: false
		},
		fieldOverrides: {
			type: Boolean,
			required: false,
			default: false
		},
		keyBold: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	computed: {

		/**
		 * Returns the key type based on the edit and disableEdit props
		 *
		 * @return {string}
		 */
		keyType: function () {
			if ( !this.edit ) {
				return 'view';
			}
			if ( !this.disableEdit ) {
				return 'edit';
			}
			return 'edit-disabled';
		},

		/**
		 * Finds the correct root class
		 *
		 * @return {string}
		 */
		rootClasses: function () {
			const classList = [];

			if ( this.depth ) {
				classList.push( `ext-wikilambda-app-key-level--${ this.depth }` );
			}

			return classList;
		},

		/**
		 * Returns the css classes that identify the expand button
		 *
		 * @return {Object}
		 */
		expandToggleClass: function () {
			return {
				'ext-wikilambda-app-key-value-block__pre-button': true,
				'ext-wikilambda-app-key-value-block__pre-button--disabled': this.edit && this.disableEdit
			};
		}

	},
	methods: {
		/**
		 * Emits the toggle expand event
		 */
		toggleExpand: function () {
			this.$emit( 'toggle-expand', !this.expanded );
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-key-value-block {
	flex: 1;
	display: flex;
	flex-flow: row nowrap;
	justify-content: space-between;
	margin-bottom: @spacing-50;

	.ext-wikilambda-app-key-value-block__pre {
		flex: 0 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-right: @spacing-25;
	}

	.ext-wikilambda-app-key-value-block__pre-buttons {
		display: flex;
		flex-direction: row;

		button {
			flex: 0 1;
		}
	}

	.ext-wikilambda-app-key-value-block__pre-button {
		flex: 0 1;
		color: @color-subtle;

		&--disabled {
			color: @color-disabled;
		}
	}

	.ext-wikilambda-app-key-value-block__pre-border {
		border-right: @border-width-base @border-style-base @border-color-base;
		border-color: var( --levelColor );
		flex: 1;
	}

	.ext-wikilambda-app-key-value-block__main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: @size-200;
		justify-content: center;
		position: relative;

		// Does not indent a key-value-set's first level when no-indent is set
		&--no-indent {
			> .ext-wikilambda-app-key-value-block__value {
				> .ext-wikilambda-app-object-key-value-set.ext-wikilambda-app-key-value-block--1 {
					margin-left: 0;
				}
			}
		}
	}

	.ext-wikilambda-app-key-value-block__key {
		label {
			margin-right: @spacing-25;
			line-height: @spacing-200;
		}
	}
}
</style>
