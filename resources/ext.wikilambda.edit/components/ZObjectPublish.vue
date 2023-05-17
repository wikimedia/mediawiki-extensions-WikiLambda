<template>
	<!--
		Wikilambda Vue component for publishing a zobject.
		Contains both the publish button and the dialog pop-up flow prior
		to submission.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-publish-zobject">
		<cdx-button
			class="ext-wikilambda-publish-zobject__publish-button"
			:action="action"
			:disabled="isDisabled"
			@click.stop="handlePublish">
			{{ $i18n( 'wikilambda-publishnew' ).text() }}
		</cdx-button>
		<wl-publish-dialog
			:show-dialog="showPublishDialog"
			:should-unattach-implementation-and-tester="shouldUnattachImplementationAndTester"
			@close-dialog="closeDialog"
		></wl-publish-dialog>
	</div>
</template>

<script>
var CdxButton = require( '@wikimedia/codex' ).CdxButton,
	mapActions = require( 'vuex' ).mapActions,
	PublishDialog = require( './base/PublishDialog.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-z-object-publish',
	components: {
		'cdx-button': CdxButton,
		'wl-publish-dialog': PublishDialog
	},
	props: {
		shouldUnattachImplementationAndTester: {
			type: Boolean,
			required: false,
			default: false
		},
		isDisabled: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	data: function () {
		return {
			action: 'progressive',
			showPublishDialog: false
		};
	},
	methods: $.extend( {},
		mapActions( [ 'validateZObject' ] ),
		{
			handlePublish: function () {
				this.validateZObject().then( function ( isValid ) {
					if ( isValid ) {
						this.showPublishDialog = true;
					}
				}.bind( this ) );
			},
			closeDialog: function () {
				this.showPublishDialog = false;
			}
		}
	)
};
</script>

<style lang="less">

.ext-wikilambda-publish-zobject {
	&__publish-button {
		margin-right: 16px;
	}
}
</style>
