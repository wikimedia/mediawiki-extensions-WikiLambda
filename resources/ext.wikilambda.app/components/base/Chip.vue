<!--
	WikiLambda Vue component for a "Chip" / input tag

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-chip"
		:class="'ext-wikilambda-app-chip--' + intent"
		@click.stop=""
	>
		<div
			class="ext-wikilambda-app-chip__text"
			role="group"
			:class="hover"
			:contenteditable="!readonly"
			@keydown.enter="handleEnter( $event )"
		>
			{{ text }}
		</div>
		<div
			v-if="editableContainer"
			class="ext-wikilambda-app-chip__icon-container"
			role="button"
			:aria-label="$i18n( 'wikilambda-chip-remove' ).text()"
			@click="handleRemove"
		>
			<cdx-icon
				class="ext-wikilambda-app-chip__icon"
				:icon="icon"
			></cdx-icon>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../lib/icons.json' );

module.exports = exports = defineComponent( {
	name: 'wl-chip-item',
	components: {
		'cdx-icon': CdxIcon
	},
	props: {
		text: {
			type: String,
			required: true
		},
		index: {
			type: Number,
			required: true
		},
		readonly: { // if chip can be edited
			type: Boolean,
			required: false
		},
		editableContainer: {
			type: Boolean,
			required: false,
			// eslint-disable-next-line vue/no-boolean-default
			default: true
		},
		intent: {
			validator: function ( value ) {
				return [ 'notice', 'warning', 'error', 'success' ].includes( value );
			},
			type: String,
			default: 'notice',
			required: false
		}
	},
	data: function () {
		return {
			icon: icons.cdxIconClose,
			hover: 'ext-wikilambda-app-chip__input'
		};
	},
	methods: {
		handleEnter: function ( event ) {
			event.target.blur();
			const newValue = event.target.innerText;
			if ( newValue !== this.text ) {
				this.$emit( 'edit-chip', this.index, newValue );
			}
		},
		handleRemove: function () {
			this.$emit( 'remove-chip', this.index );
		}
	}
} );

</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-chip {
	display: inline-flex;
	background-color: @background-color-interactive;
	border-width: 1.5px;
	border-style: solid;
	border-radius: @border-radius-pill;
	padding: 0 8px;
	margin-top: 2.5px;
	margin-bottom: 2.5px;
	vertical-align: middle;
	max-width: 100%;
	box-sizing: @box-sizing-base;

	&--notice {
		background-color: @background-color-base;
		border-color: @border-color-base;
	}

	&--warning {
		background-color: @background-color-warning-subtle;
		border-color: @border-color-warning;
	}

	&--error {
		background-color: @background-color-error-subtle;
		border-color: @border-color-error;
	}

	&--success {
		background-color: @background-color-success-subtle;
		border-color: @border-color-success;
	}

	.ext-wikilambda-app-chip__text {
		height: 100%;
		width: max-content;
		max-width: 100%;
		display: flex;
		align-items: center;
	}

	.ext-wikilambda-app-chip__icon-container {
		margin-left: 6px;
		width: 20px;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
	}

	.ext-wikilambda-app-chip__icon.cdx-icon {
		width: 12.4px;
		height: 12.4px;
	}
}
</style>
