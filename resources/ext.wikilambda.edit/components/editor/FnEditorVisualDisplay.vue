<template>
	<div class="ext-wikilambda-visual-display">
		<div class="ext-wikilambda-visual-display-input">
			<div class="ext-wikilambda-visual-display-input-title">
				<slot name="input">
					{{ $i18n( 'wikilambda-editor-input-title' ) }}
				</slot>
			</div>
		</div>
		<div class="ext-wikilambda-visual-display-arrow">
			<div class="ext-wikilambda-visual-display-point"></div>
		</div>
		<div class="ext-wikilambda-visual-display-function">
			<div class="function-title">
				<slot name="function">
					{{ $i18n( 'wikilambda-editor-name-zobject-name' ) }}
				</slot>
			</div>
		</div>
		<div class="ext-wikilambda-visual-display-arrow">
			<div class="ext-wikilambda-visual-display-point"></div>
		</div>
		<div class="ext-wikilambda-visual-display-output">
			<div class="ext-wikilambda-visual-display-output-title">
				<slot name="output">
					{{ $i18n( 'wikilambda-editor-output-title' ) }}
				</slot>
			</div>
		</div>
	</div>
</template>

<script>
module.exports = {};
</script>

<style lang="less">
.ext-wikilambda-visual-display {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 1em;
	text-align: center;

	& > div {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		border-radius: 5px;
		margin: 2px;
	}

	.ext-wikilambda-visual-display-input,
	.ext-wikilambda-visual-display-output {
		width: 80%;
		border: 1px solid #333;
		padding: 0.5em;
	}

	.ext-wikilambda-visual-display-arrow {
		height: 50px;
		width: 3px;
		background: #000;
		justify-content: end;

		.ext-wikilambda-visual-display-point {
			border: solid #000;
			border-width: 0 4px 4px 0;
			display: inline-block;
			padding: 5px;
			transform: rotate( 45deg );
			-webkit-transform: rotate( 45deg );
			overflow: hidden;
		}
	}

	.ext-wikilambda-visual-display-function {
		width: 80%;
		height: 100px;
		border: 1px solid #333;
		background: rgba( 0, 0, 0, 0.1 );
	}
}
</style>
