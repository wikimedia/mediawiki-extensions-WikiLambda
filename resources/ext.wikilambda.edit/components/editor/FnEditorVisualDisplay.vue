<template>
	<!--
		WikiLambda Vue component for a graphical rendering of the function inside the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-editior-visual-display">
		<div class="ext-wikilambda-editior-visual-display-head">
			<span class="ext-wikilambda-editior-visual-display-head-title">Work summary</span>
		</div>
		<div class="ext-wikilambda-editior-visual-display-body">
			<fn-editor-zlanguage-selector
				class="ext-wikilambda-editior-visual-display-language-selector"
				:show-add-language="false"
			></fn-editor-zlanguage-selector>

			<div class="ext-wikilambda-editior-visual-display-name">
				<span>{{ title }}</span>
			</div>

			<div class="ext-wikilambda-editior-visual-display-input">
				<span
					class="ext-wikilambda-editior-visual-display-input-title"
				>{{ $i18n('wikilambda-editor-input-title') }} {{ inputLengthText }}</span>

				<div class="ext-wikilambda-editior-visual-display-slide">
					<div class="ext-wikilambda-editior-visual-display-slide-box">
						<div :style="inputBoxStyle">
							<div v-for="(input, i) in inputs"
								:key="i"
								class="ext-wikilambda-editior-visual-display-input-box">
								<span name="input">
									<template v-if="input.type && input.type.zid">
										<a :href="`/wiki/${input.type.zid}`" target="_blank">
											{{ input.type.label }}
										</a>, “{{ input.label }}”
									</template>
									<template v-else>
										{{ input.label }}
									</template>
								</span>
							</div>
						</div>
					</div>

					<div v-if="inputs.length > 1 && activeInput < inputs.length"
						class="ext-wikilambda-editior-visual-display-slide-control-right"
						@click="nextActiveInput">
					</div>

					<div v-if="activeInput > 1"
						class="ext-wikilambda-editior-visual-display-slide-control-left"
						@click="prevActiveInput">
					</div>
				</div>
			</div>

			<div class="ext-wikilambda-editior-visual-display-divider">
				<div class="ext-wikilambda-editior-visual-display-divider-arrow"></div>
			</div>

			<div class="ext-wikilambda-editior-visual-display-function">
				<div class="ext-wikilambda-editior-visual-display-function-box">
					<span>{{ $i18n('wikilambda-editor-implementation-title') }}</span>
				</div>
			</div>

			<div class="ext-wikilambda-editior-visual-display-divider">
				<div class="ext-wikilambda-editior-visual-display-divider-arrow"></div>
			</div>

			<div class="ext-wikilambda-editior-visual-display-output">
				<div class="ext-wikilambda-editior-visual-display-output-box">
					<template v-if="output.zid">
						<a :href="`/wiki/${output.zid}`" target="_blank">{{ output.title }}</a>
					</template>
					<template v-else>
						{{ output.title }}
					</template>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
var FnEditorZLanguageSelector = require( './FnEditorZLanguageSelector.vue' ),
	Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	components: {
		'fn-editor-zlanguage-selector': FnEditorZLanguageSelector
	},
	data: function () {
		return {
			activeInput: 1,
			inputWidth: 0
		};
	},
	computed: $.extend( mapGetters( [
		'getZObjectLabel',
		'getNestedZObjectById',
		'getZargumentsArray',
		'getZkeyLabels'
	] ), {
		title: function () {
			return this.getZObjectLabel.value || mw.message( 'wikilambda-editor-default-name' ).text();
		},
		output: function () {
			return this.outputValue.zid ? this.outputValue : { title: mw.message( 'wikilambda-editor-output-title' ).text() };
		},
		inputs: function () {
			return this.getZargumentsArray || [ {
				label: mw.message( 'wikilambda-editor-input-title' ).text()
			} ];
		},
		zReturnType: function () {
			return this.getNestedZObjectById( 0, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_RETURN_TYPE,
				Constants.Z_REFERENCE_ID
			] );
		},
		outputValue: function () {
			return {
				title: this.getZkeyLabels[ this.zReturnType.value ],
				zid: this.zReturnType.value
			};
		},
		inputLengthText: function () {
			// return an emty text if inputs is default inputs value
			if ( this.inputs.length === 1 && !this.inputs[ 0 ].type ) {
				return '';
			}

			return '(' + this.activeInput + '/' + this.inputs.length + ')';
		},
		inputBoxStyle: function () {
			var width = 0 - ( ( this.activeInput - 1 ) * this.inputWidth );
			return {
				transform: 'translateX(' + width + 'px)'
			};
		}
	} ),
	methods: {
		nextActiveInput: function () {
			if ( this.activeInput < this.inputs.length ) {
				this.setInputWidth();
				this.activeInput++;
			}
		},
		prevActiveInput: function () {
			if ( this.activeInput > 1 ) {
				this.setInputWidth();
				this.activeInput--;
			}
		},
		setInputWidth: function () {
			this.inputWidth = this.$el.querySelectorAll( '.ext-wikilambda-editior-visual-display-input-box' )[ 0 ].offsetWidth;
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-editior-visual-display {
	background: #fef6e7;
	min-height: 555px;

	&-head {
		padding: 16px;
		text-align: center;
		border-bottom: 1px solid #eaecf0;

		&-title {
			font-weight: bold;
			font-size: 1em;
			line-height: 1.4em;
			text-align: center;
			color: #000;
		}
	}

	&-body {
		padding: 16px 25px;
	}

	&-language-selector {
		margin-bottom: 18px;
	}

	&-name {
		font-size: 1.5em;
		line-height: 2.1em;
		color: #000;
		margin-bottom: 24px;
		min-height: 30px;
		word-break: break-word;
	}

	&-slide {
		position: relative;
		justify-content: center;
		align-items: center;

		&-box {
			overflow: hidden;

			& > div {
				display: flex;

				& > div {
					float: left;
					width: ~'calc( 100% - 2px )';
					height: 34px;
					flex: none;
				}
			}
		}

		&-control {
			&-right {
				width: 0;
				height: 0;
				border-top: 6px solid transparent;
				border-left: 10px solid #000;
				border-bottom: 6px solid transparent;
				position: absolute;
				bottom: ~'calc( 50% - 6px )';
				right: -17px;
			}

			&-left {
				width: 0;
				height: 0;
				border-top: 6px solid transparent;
				border-right: 10px solid #000;
				border-bottom: 6px solid transparent;
				position: absolute;
				bottom: ~'calc( 50% - 6px )';
				left: -17px;
			}
		}
	}

	&-input {
		&-title {
			font-size: 1em;
			line-height: 1.4em;
			color: #000;
		}

		&-box {
			float: left;
			width: 248px;
		}
	}

	&-output-box {
		height: 34px;
	}

	&-function-box {
		height: 100px;
	}

	&-input-box,
	&-output-box,
	&-function-box {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #72777d;
		border: 1px solid #333;
		border-radius: 4px;
	}

	&-divider {
		display: flex;
		align-items: end;
		justify-content: center;
		height: 55px;
		position: relative;

		&:after {
			content: '';
			height: 50px;
			width: 2px;
			top: 0;
			background: #000;
			position: absolute;
		}

		&-arrow {
			width: 0;
			height: 0;
			border-left: 6px solid transparent;
			border-right: 6px solid transparent;
			border-top: 10px solid #000;
		}
	}
}
</style>
