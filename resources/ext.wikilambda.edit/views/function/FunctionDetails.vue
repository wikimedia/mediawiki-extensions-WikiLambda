<template>
	<!--
		WikiLambda Vue component for the details tab in the ZFunction Viewer.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<main class="ext-wikilambda-function-details">
		<div class="ext-wikilambda-function-details__summary">
			{{ $i18n( 'wikilambda-function-details-summary' ).text() }}
		</div>
		<section>
		</section>
		<section>
		</section>
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
	padding-top: 16px;
	min-height: 450px;
	overflow-y: auto;
	display: grid;
	grid-template-columns: 1fr 1fr;

	&__summary:extend(.ext-wikilambda-edit__text-regular) {
		color: @wmui-color-base30;
		grid-column: 1 ~'/' span 2;
		margin-bottom: 32px;
	}

	&__names,
	&__aliases {
		margin-top: 10%;
	}
}
</style>
