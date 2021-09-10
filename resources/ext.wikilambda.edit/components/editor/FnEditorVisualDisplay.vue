<template>
	<div class="ext-wikilambda-visual-display">
		<div class="input">
			<div class="input-title">
				<slot name="input">
					{{ $i18n( 'wikilambda-editor-input-title' ) }}
				</slot>
			</div>
		</div>
		<div class="arrow">
			<div class="point"></div>
		</div>
		<div class="function">
			<div class="function-title">
				<slot name="function">
					{{ $i18n( 'wikilambda-editor-name-zobject-name' ) }}
				</slot>
			</div>
		</div>
		<div class="arrow">
			<div class="point"></div>
		</div>
		<div class="output">
			<div class="output-title">
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

	.input,
	.output {
		width: 80%;
		border: 1px solid #333;
		padding: 0.5em;
	}

	.arrow {
		height: 50px;
		width: 3px;
		background: #000;
		justify-content: end;

		.point {
			border: solid #000;
			border-width: 0 4px 4px 0;
			display: inline-block;
			padding: 5px;
			transform: rotate( 45deg );
			-webkit-transform: rotate( 45deg );
			overflow: hidden;
		}
	}

	.function {
		width: 80%;
		height: 100px;
		border: 1px solid #333;
		background: rgba( 0, 0, 0, 0.1 );
	}
}
</style>
