<template>
	<div>
		<strong>
			{{ $i18n( 'wikilambda-editor-progress-title' ) }}
		</strong>
		<div>{{ progress }}{{ $i18n( 'wikilambda-editor-progress-percentage') }}</div>
		<div class="ext-wikilambda-progress-bar">
			<div></div>
		</div>
	</div>
</template>

<script>
module.exports = {
	props: {
		progress: {
			type: Number,
			required: true
		}
	},
	watch: {
		progress: {
			immediate: true,
			handler: function () {
				// NOTE: This will change when we migrate to Vue3.
				document.documentElement.style.setProperty( '--ext-wikilambda-complete-percentage', this.progress + '%' );
			}
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-progress-bar {
	background-color: #ccc;
	border-radius: 13px;
	padding: 3px;

	& > div {
		background-color: #000;
		width: var( --ext-wikilambda-complete-percentage );
		height: 8px;
		border-radius: 10px;
		transition-property: width;
		transition-duration: 150ms;
	}
}
</style>
