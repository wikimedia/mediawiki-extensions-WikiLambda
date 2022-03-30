<template>
	<!--
		WikiLambda Vue component for the details tab in the ZFunction Viewer.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<main class="ext-wikilambda-function-details">
		<div id="fnDefinitionContainer" class="ext-wikilambda-function-details__container">
			<div class="ext-wikilambda-function-details__summary">
				{{ $i18n( 'wikilambda-function-details-summary' ).text() }}
			</div>
		</div>
	</main>
</template>

<script>

// @vue/component
module.exports = exports = {
	name: 'function-details',
	components: {
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-details {
	&__container {
		padding-top: 20px;
		padding-left: 27px;
		border: 1px solid @wmui-color-base80;
		min-height: 450px;
		overflow-y: auto;
	}

	&__summary:extend(.ext-wikilambda-edit__text-regular) {
		color: @wmui-color-base30;
	}
}
</style>
