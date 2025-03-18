<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-function-select-item"
		@click="$emit( 'click' )"
	>
		<p
			v-if="labelData"
			class="ext-wikilambda-app-function-select-item__title"
			:lang="labelData.langCode"
			:dir="labelData.langDir"
		>
			{{ labelData.label }}
		</p>
		<p
			v-else
			class="ext-wikilambda-app-function-select-item__title"
		>
			{{ label }}
		</p>
		<!-- TODO (T387361): add langCode and langDir -->
		<wl-expandable-description
			:description="description"
			class="ext-wikilambda-app-function-select-item__description"
		></wl-expandable-description>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const ExpandableDescription = require( './ExpandableDescription.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-select-item',
	components: {
		'wl-expandable-description': ExpandableDescription
	},
	props: {
		labelData: {
			type: Object,
			default: null
		},
		label: {
			type: String,
			default: ''
		},
		description: {
			type: String,
			default: ''
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-select-item {
	position: relative;
	padding: @spacing-50 @spacing-100;

	&__title {
		margin: 0;
		color: @color-base;
		font-weight: @font-weight-normal;
	}

	&__description {
		color: @color-subtle;
	}

	&:hover {
		background-color: @background-color-interactive;

		.ext-wikilambda-app-expandable-description__toggle-button {
			background-color: @background-color-interactive;

			&::before {
				background: linear-gradient( to right, transparent, @background-color-interactive );
			}
		}
	}
}
</style>
